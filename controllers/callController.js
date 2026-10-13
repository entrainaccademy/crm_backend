import Call from "../models/Call.js";
import Lead from "../models/Lead.js";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { isExecutive, isSeller } from "../middleware/scope.js";
import { fetchRecordingStream, formatDuration } from "../services/telephonyService.js";

/**
 * Sanitize note text to ensure no "[object Object]" is stored
 */
function sanitizeNoteText(notes) {
  if (!notes) return "";
  if (typeof notes === "string") {
    if (notes === "[object Object]" || notes.startsWith("[object Object]")) {
      return "";
    }
    return notes.trim();
  }
  if (Array.isArray(notes)) {
    return notes
      .map((n) => (typeof n === "string" ? n : n?.text || ""))
      .filter((t) => t && t !== "[object Object]")
      .join("\n")
      .trim();
  }
  if (typeof notes === "object") {
    return (notes.text || notes.note || "").trim();
  }
  return String(notes).trim();
}

/**
 * Parse mm:ss to seconds
 */
function parseDurationToSeconds(durationStr) {
  if (!durationStr || typeof durationStr !== "string") return 0;
  const parts = durationStr.split(":").map((p) => parseInt(p, 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

// @desc    Get all call logs
// @route   GET /api/calls
// @access  Private
export const getCalls = async (req, res) => {
  try {
    const { search, status, direction, assigned } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { service: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    if (status && status !== "All") query.callStatus = status;
    if (direction && direction !== "All") query.direction = direction;
    if (assigned && assigned !== "All") query.assigned = assigned;

    // Enforce role assignment scope: Sales Executive sees only their calls
    if (isExecutive(req.user)) {
      query.$or = [
        { assigned: req.user.name },
        { executiveId: req.user._id },
      ];
    }

    const calls = await Call.find(query).sort("-createdAt");

    // Clean any legacy [object Object] in response on-the-fly
    const cleanedCalls = calls.map((c) => {
      const obj = c.toObject();
      if (obj.notes && (obj.notes === "[object Object]" || obj.notes.startsWith("[object Object]"))) {
        obj.notes = "";
      }
      return obj;
    });

    res.json({
      success: true,
      count: cleanedCalls.length,
      data: cleanedCalls,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single call log
// @route   GET /api/calls/:id
// @access  Private
export const getCallById = async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    if (!call) {
      return res.status(404).json({ success: false, message: "Call log not found" });
    }

    if (isExecutive(req.user) && call.assigned !== req.user.name && call.executiveId && !call.executiveId.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: "You are not authorized to view this call log" });
    }

    const obj = call.toObject();
    if (obj.notes && (obj.notes === "[object Object]" || obj.notes.startsWith("[object Object]"))) {
      obj.notes = "";
    }

    res.json({ success: true, data: obj });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Log a new manual call (from dial without recording fallback)
// @route   POST /api/calls
// @access  Private
export const logCall = async (req, res) => {
  try {
    // Only manual call facts may come from a CRM user. Provider evidence is never client supplied.
    const allowed = ["leadId", "name", "phone", "direction", "duration", "callStatus", "callDate", "callTime", "service", "assigned", "notes"];
    const data = Object.fromEntries(allowed.filter((key) => req.body[key] !== undefined).map((key) => [key, req.body[key]]));
    if (isSeller(req.user)) {
      data.assigned = req.user.name;
      data.executiveId = req.user._id;
    }
    data.notes = sanitizeNoteText(data.notes);
    data.callType = "manual";
    data.recordingStatus = "Not recorded";
    data.durationSeconds = parseDurationToSeconds(data.duration);
    if (!data.duration) data.duration = "00:00";

    // Find linked lead if available
    if (data.leadId && !data.leadRef) {
      const lead = await Lead.findOne({
        $or: [{ customId: Number(data.leadId) }, { _id: data.leadId }],
      });
      if (lead) {
        data.leadRef = lead._id;
        data.leadId = lead.customId;
      }
    }

    const call = await Call.create(data);

    // If linked to a lead, log activity
    if (call.leadRef) {
      try {
        await Lead.findByIdAndUpdate(call.leadRef, {
          $push: {
            activities: {
              text: `Self-reported call logged by ${req.user.name} (${call.callStatus}, ${call.duration || "00:00"})`,
              time: "Just now",
              type: "call",
            },
          },
        });
      } catch (e) {
        console.warn("Could not log lead activity:", e.message);
      }
    }

    res.status(201).json({ success: true, data: call });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update call notes or details
// @route   PUT /api/calls/:id
// @access  Private
export const updateCall = async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    if (!call) {
      return res.status(404).json({ success: false, message: "Call log not found" });
    }

    if (isExecutive(req.user) && call.assigned !== req.user.name && call.executiveId && !call.executiveId.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: "You are not authorized to update this call log" });
    }

    // Editing provider outcomes, SIDs, durations, and recording metadata would destroy the evidence.
    if (Object.keys(req.body).some((key) => key !== "notes")) {
      return res.status(400).json({ success: false, message: "Only call notes can be edited" });
    }
    const updates = { notes: sanitizeNoteText(req.body.notes) };

    const updated = await Call.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a call log
// @route   DELETE /api/calls/:id
// @access  Private (Managers, Super Admin)
export const deleteCall = async (req, res) => {
  try {
    const query = { _id: req.params.id, callType: "manual" };
    const call = await Call.findOneAndDelete(query);
    if (!call) {
      const existing = await Call.findById(req.params.id);
      return res.status(existing ? 403 : 404).json({
        success: false,
        message: existing ? "Provider call evidence cannot be deleted" : "Call log not found",
      });
    }
    res.json({ success: true, message: "Call log deleted", data: call });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Stream call recording audio securely (Authenticated audio proxy)
// @route   GET /api/calls/:id/audio
// @access  Private (Admins all recordings; Sales Executives only their assigned calls)
export const streamCallRecording = async (req, res) => {
  try {
    // 1. Resolve User from Authorization Header OR ?token= query parameter (for HTML5 <audio> elements)
    let user = req.user;
    if (!user) {
      const token =
        (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")
          ? req.headers.authorization.split(" ")[1]
          : null) || req.query.token;

      if (!token) {
        return res.status(401).json({ success: false, message: "Authentication required to stream recording" });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user = await User.findById(decoded.id).select("-password");
        if (!user || user.status !== "Active") {
          return res.status(401).json({ success: false, message: "Account unavailable" });
        }
      } catch (err) {
        return res.status(401).json({ success: false, message: "Invalid or expired media authentication token" });
      }
    }

    // 2. Find Call
    const call = await Call.findById(req.params.id);
    if (!call) {
      return res.status(404).json({ success: false, message: "Call record not found" });
    }

    // 3. Enforce Permissions:
    // Super Admin, Manager, Data Analytics Manager, Team Lead: can access all recordings
    // Sales Executive: can ONLY access their own recordings
    if (isExecutive(user)) {
      const isAssigned = call.assigned === user.name;
      const isOwner = call.executiveId && call.executiveId.equals(user._id);
      if (!isAssigned && !isOwner) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to access this call recording",
        });
      }
    }

    // 4. Check recording availability
    if (call.recordingStatus !== "Available" || (!call.recordingUrl && !call.recordingSid)) {
      return res.status(404).json({
        success: false,
        message: `Recording is ${call.recordingStatus || "not available"} for this call.`,
      });
    }

    // 5. Fetch stream from provider securely
    const rangeHeader = req.headers.range || "";
    const providerResponse = await fetchRecordingStream(call, rangeHeader);

    // Forward response headers
    res.status(providerResponse.status);
    const contentType = providerResponse.headers.get("content-type") || "audio/mpeg";
    const contentLength = providerResponse.headers.get("content-length");
    const contentRange = providerResponse.headers.get("content-range");
    const acceptRanges = providerResponse.headers.get("accept-ranges") || "bytes";

    res.set({
      "Content-Type": contentType,
      "Accept-Ranges": acceptRanges,
      "Cache-Control": "private, max-age=3600",
    });

    if (contentLength) res.set("Content-Length", contentLength);
    if (contentRange) res.set("Content-Range", contentRange);

    // Pipe audio stream to client
    if (providerResponse.body) {
      // providerResponse.body is a ReadableStream in Node fetch
      const nodeStream = (await import("node:stream")).Readable.fromWeb(providerResponse.body);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    console.error("Audio streaming error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message || "Failed to stream recording" });
    }
  }
};
