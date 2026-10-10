import {
  getTelephonyConfig,
  initiateOutboundBridge,
  generateBridgeTwiML,
  handleStatusCallback,
  handleDialAction,
  handleRecordingCallback,
} from "../services/telephonyService.js";
import Call from "../models/Call.js";
import Lead from "../models/Lead.js";
import { isExecutive } from "../middleware/scope.js";

// @desc    Get Telephony Provider Status & Configuration Info
// @route   GET /api/telephony/status
// @access  Private (Authenticated users)
export const getProviderStatus = async (req, res) => {
  try {
    const config = getTelephonyConfig();
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Initiate click-to-call with automatic recording
// @route   POST /api/telephony/initiate
// @access  Private (Sales Executive, Team Lead, Manager, Super Admin)
export const initiateCall = async (req, res) => {
  try {
    const { leadId, customerPhone, customerName, service, agentPhone, notes } = req.body;

    if (!customerPhone) {
      return res.status(400).json({
        success: false,
        message: "Customer phone number is required to make a call.",
      });
    }

    // Permission enforcement: Executives can only call their assigned leads
    if (leadId && isExecutive(req.user)) {
      const lead = await Lead.findOne({
        $or: [{ customId: Number(leadId) }, { _id: leadId }],
      });
      if (lead && lead.assigned && lead.assigned !== req.user.name && lead.assigned !== "Unassigned") {
        return res.status(403).json({
          success: false,
          message: "You can only initiate calls to leads assigned to you.",
        });
      }
    }

    const host = req.get("host");
    const result = await initiateOutboundBridge({
      leadId,
      customerPhone,
      customerName,
      service,
      executiveUser: req.user,
      agentPhone: agentPhone || req.user.phone,
      notes,
      reqHost: host,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Telephony initiate error:", error);
    const status = error.code === "PROVIDER_NOT_CONFIGURED" ? 503 : 400;
    res.status(status).json({
      success: false,
      code: error.code || "CALL_INITIATION_FAILED",
      message: error.message,
      missing: error.missing,
      details: error.details,
    });
  }
};

// @desc    Get live status of a call
// @route   GET /api/telephony/call/:id/status
// @access  Private
export const getCallStatus = async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    if (!call) {
      return res.status(404).json({ success: false, message: "Call record not found" });
    }

    // Enforce permissions: Executive can only view their own calls
    if (isExecutive(req.user) && call.assigned !== req.user.name && call.executiveId && !call.executiveId.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this call.",
      });
    }

    res.json({
      success: true,
      data: call,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate TwiML when executive picks up the phone
// @route   GET / POST /api/telephony/webhook/twiml
// @access  Public (Telephony Provider Webhook)
export const serveTwiml = async (req, res) => {
  try {
    const callId = req.query.callId || req.body.callId;
    const customerPhone = req.query.to || req.query.customerPhone || req.body.to;

    let baseUrl = process.env.WEBHOOK_BASE_URL || process.env.SERVER_BASE_URL || "";
    if (!baseUrl) {
      const proto = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      baseUrl = `${proto}://${req.get("host")}`;
    }

    const twiml = generateBridgeTwiML({
      callId,
      customerPhone,
      webhookBaseUrl: baseUrl.replace(/\/+$/, ""),
    });

    res.set("Content-Type", "text/xml");
    res.send(twiml);
  } catch (error) {
    console.error("TwiML generation error:", error);
    res.set("Content-Type", "text/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>An error occurred connecting your call.</Say><Hangup/></Response>`);
  }
};

// @desc    Handle status callback from provider
// @route   POST /api/telephony/webhook/status
// @access  Public (Telephony Provider Webhook)
export const handleStatusWebhook = async (req, res) => {
  try {
    const callId = req.query.callId;
    const leg = req.query.leg || "agent";
    const body = req.body || {};

    await handleStatusCallback({ callId, leg, body });
    res.status(200).send("<Response/>");
  } catch (error) {
    console.error("Status webhook error:", error);
    res.status(200).send("<Response/>"); // Always 200 to acknowledge provider
  }
};

// @desc    Handle dial action when customer leg ends
// @route   POST /api/telephony/webhook/dial-action
// @access  Public (Telephony Provider Webhook)
export const handleDialActionWebhook = async (req, res) => {
  try {
    const callId = req.query.callId;
    const body = req.body || {};

    await handleDialAction({ callId, body });
    res.set("Content-Type", "text/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  } catch (error) {
    console.error("Dial action webhook error:", error);
    res.set("Content-Type", "text/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  }
};

// @desc    Handle recording callback from provider
// @route   POST /api/telephony/webhook/recording
// @access  Public (Telephony Provider Webhook)
export const handleRecordingWebhook = async (req, res) => {
  try {
    const callId = req.query.callId;
    const body = req.body || {};

    await handleRecordingCallback({ callId, body });
    res.status(200).send("<Response/>");
  } catch (error) {
    console.error("Recording webhook error:", error);
    res.status(200).send("<Response/>");
  }
};
