import Lead from "../models/Lead.js";
import Followup from "../models/Followup.js";

const detailsFromLead = (lead) => ({
  leadId: lead.customId,
  leadRef: lead._id,
  name: lead.name,
  phone: lead.phone,
  whatsapp: lead.whatsapp,
  email: lead.email,
  location: lead.location,
  service: lead.service,
  source: lead.source,
  assigned: lead.assigned,
  priority: lead.priority,
  date: lead.date,
  time: lead.time || "10:00",
});

export const ensureLeadFollowup = async (lead, previousSchedule) => {
  if (!lead?.customId || !lead.date) return null;

  const details = detailsFromLead(lead);
  const matching = await Followup.findOne({
    leadId: lead.customId,
    completed: false,
    date: details.date,
    time: details.time,
  });
  if (matching) return matching;

  if (previousSchedule?.date) {
    const previous = await Followup.findOne({
      leadId: lead.customId,
      completed: false,
      date: previousSchedule.date,
      time: previousSchedule.time || "10:00",
    });
    if (previous) {
      return Followup.findByIdAndUpdate(previous._id, { $set: details }, { new: true });
    }
  }

  return Followup.create({ ...details, purpose: "Course counselling", type: "Call" });
};

export const refreshLeadNextFollowup = async (leadId) => {
  const next = await Followup.findOne({ leadId, completed: false }).sort({ date: 1, time: 1 });
  await Lead.updateOne(
    { customId: leadId },
    { $set: { date: next?.date || "", time: next?.time || "" } },
  );
};
