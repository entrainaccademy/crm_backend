import Lead from "../models/Lead.js";
import Followup from "../models/Followup.js";

// @desc    Get all leads with filters & search
// @route   GET /api/leads
export const getLeads = async (req, res) => {
  try {
    const {
      search,
      status,
      source,
      assigned,
      team,
      priority,
      service,
      startDate,
      endDate,
      sort = "-createdAt",
      page = 1,
      limit = 100,
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { service: { $regex: search, $options: "i" } },
      ];
    }

    if (status && status !== "All") query.status = status;
    if (source && source !== "All") query.source = source;
    if (assigned && assigned !== "All") query.assigned = assigned;
    if (team && team !== "All") query.team = team;
    if (priority && priority !== "All") query.priority = priority;
    if (service && service !== "All") query.service = service;

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const leads = await Lead.find(query)
      .sort(sort)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Lead.countDocuments(query);

    res.json({
      success: true,
      count: leads.length,
      total,
      data: leads,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single lead by ID
// @route   GET /api/leads/:id
export const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = isNaN(id) ? { _id: id } : { customId: Number(id) };
    const lead = await Lead.findOne(query);

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new lead
// @route   POST /api/leads
export const createLead = async (req, res) => {
  try {
    const highestLead = await Lead.findOne().sort("-customId");
    const nextCustomId = (highestLead?.customId || 0) + 1;

    const leadData = {
      ...req.body,
      customId: req.body.customId || nextCustomId,
      created: req.body.created || new Date().toISOString().split("T")[0],
      date: req.body.date || new Date().toISOString().split("T")[0],
    };

    // If initial activity is not provided, add default
    if (!leadData.activities || leadData.activities.length === 0) {
      leadData.activities = [
        {
          text: `Lead created from ${leadData.source || "Website"}`,
          time: new Date().toLocaleString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ];
      if (leadData.assigned && leadData.assigned !== "Unassigned") {
        leadData.activities.push({
          text: `Assigned to ${leadData.assigned}`,
          time: new Date().toLocaleString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
      }
    }

    const lead = await Lead.create(leadData);

    // If status is Follow-up, optionally create a Followup record
    if (lead.status === "Follow-up") {
      await Followup.create({
        leadId: lead.customId,
        leadRef: lead._id,
        name: lead.name,
        phone: lead.phone,
        whatsapp: lead.whatsapp,
        email: lead.email,
        service: lead.service,
        assigned: lead.assigned,
        team: lead.team,
        purpose: "Course counselling",
        type: "Call",
        date: lead.date,
        time: lead.time || "11:00",
      });
    }

    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update lead
// @route   PUT /api/leads/:id
export const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const query = isNaN(id) ? { _id: id } : { customId: Number(id) };

    const oldLead = await Lead.findOne(query);
    if (!oldLead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    const updates = { ...req.body };

    // Record activity if status changed
    if (updates.status && updates.status !== oldLead.status) {
      const nowStr = new Date().toLocaleString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      oldLead.activities.unshift({
        text: `Status changed from ${oldLead.status} to ${updates.status}`,
        time: nowStr,
        type: "status_change",
      });
      updates.activities = oldLead.activities;
    }

    // Record activity if assignment changed
    if (updates.assigned && updates.assigned !== oldLead.assigned) {
      const nowStr = new Date().toLocaleString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      oldLead.activities.unshift({
        text: `Reassigned to ${updates.assigned}`,
        time: nowStr,
        type: "assignment",
      });
      updates.activities = oldLead.activities;
    }

    const lead = await Lead.findOneAndUpdate(query, updates, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete lead
// @route   DELETE /api/leads/:id
export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    const query = isNaN(id) ? { _id: id } : { customId: Number(id) };

    const lead = await Lead.findOneAndDelete(query);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    // Also remove associated follow-ups
    await Followup.deleteMany({ leadId: lead.customId });

    res.json({ success: true, message: "Lead removed successfully", data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add Note to lead
// @route   POST /api/leads/:id/notes
export const addLeadNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, author = "User" } = req.body;

    const query = isNaN(id) ? { _id: id } : { customId: Number(id) };
    const lead = await Lead.findOne(query);

    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    lead.notes.unshift({ text, author, createdAt: new Date() });
    lead.activities.unshift({
      text: `Note added: "${text.substring(0, 40)}${text.length > 40 ? "..." : ""}"`,
      time: new Date().toLocaleString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "note",
    });

    await lead.save();

    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Batch assign leads
// @route   POST /api/leads/batch-assign
export const batchAssignLeads = async (req, res) => {
  try {
    const { leadIds, assigned, team } = req.body;
    if (!leadIds || !leadIds.length) {
      return res.status(400).json({ success: false, message: "No lead IDs provided" });
    }

    await Lead.updateMany(
      { customId: { $in: leadIds } },
      { $set: { assigned, team } }
    );

    res.json({ success: true, message: `Successfully assigned ${leadIds.length} leads to ${assigned}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
