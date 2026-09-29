import Followup from "../models/Followup.js";
import Lead from "../models/Lead.js";
import { applyAssignmentScope, canAccessAssigned, isExecutive, isLeader } from "../middleware/scope.js";

// @desc    Get all followups with filtering
// @route   GET /api/followups
export const getFollowups = async (req, res) => {
  try {
    const {
      search,
      assigned,
      status,
      priority,
      completed,
      type,
      sort = "-createdAt",
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { service: { $regex: search, $options: "i" } },
        { purpose: { $regex: search, $options: "i" } },
      ];
    }

    if (assigned && assigned !== "All") query.assigned = assigned;
    if (status && status !== "All") query.status = status;
    if (priority && priority !== "All") query.priority = priority;
    if (type && type !== "All") query.type = type;
    if (completed !== undefined) query.completed = completed === "true";

    applyAssignmentScope(req.user, query);
    const followups = await Followup.find(query).sort(sort);

    res.json({
      success: true,
      count: followups.length,
      data: followups,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a followup
// @route   POST /api/followups
export const createFollowup = async (req, res) => {
  try {
    const data = { ...req.body };
    const relatedLead = await Lead.findOne({ customId: Number(data.leadId) });
    if (!relatedLead || !canAccessAssigned(req.user, relatedLead)) return res.status(403).json({ success: false, message: "Lead access denied" });
    if (isExecutive(req.user)) { data.assigned = req.user.name; data.team = req.user.team; }
    if (isLeader(req.user) && data.team !== req.user.team) return res.status(403).json({ success: false, message: "Access denied" });
    data.assigned = relatedLead.assigned;
    data.team = relatedLead.team;
    const followup = await Followup.create(data);
    res.status(201).json({ success: true, data: followup });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update a followup
// @route   PUT /api/followups/:id
export const updateFollowup = async (req, res) => {
  try {
    const { id } = req.params;
    const query = isNaN(id) ? { _id: id } : { leadId: Number(id) };

    applyAssignmentScope(req.user, query);
    const updates = { ...req.body };
    if (isExecutive(req.user) && (updates.assigned !== undefined && updates.assigned !== req.user.name || updates.team !== undefined && updates.team !== req.user.team)) return res.status(403).json({ success: false, message: "Access denied" });
    if (isLeader(req.user) && updates.team !== undefined && updates.team !== req.user.team) return res.status(403).json({ success: false, message: "Access denied" });
    if (updates.leadId !== undefined) delete updates.leadId;
    const followup = await Followup.findOneAndUpdate(query, updates, {
      new: true,
      runValidators: true,
    });

    if (!followup) {
      return res.status(404).json({ success: false, message: "Followup not found" });
    }

    res.json({ success: true, data: followup });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Toggle followup complete
// @route   PATCH /api/followups/:id/toggle
export const toggleFollowupComplete = async (req, res) => {
  try {
    const { id } = req.params;
    const query = isNaN(id) ? { _id: id } : { leadId: Number(id) };

    applyAssignmentScope(req.user, query);
    const followup = await Followup.findOne(query);
    if (!followup) {
      return res.status(404).json({ success: false, message: "Followup not found" });
    }

    followup.completed = !followup.completed;
    followup.completedAt = followup.completed ? new Date() : null;
    await followup.save();

    res.json({ success: true, data: followup });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a followup
// @route   DELETE /api/followups/:id
export const deleteFollowup = async (req, res) => {
  try {
    const { id } = req.params;
    const query = isNaN(id) ? { _id: id } : { leadId: Number(id) };

    applyAssignmentScope(req.user, query);
    const followup = await Followup.findOneAndDelete(query);
    if (!followup) {
      return res.status(404).json({ success: false, message: "Followup not found" });
    }

    res.json({ success: true, message: "Followup removed", data: followup });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
