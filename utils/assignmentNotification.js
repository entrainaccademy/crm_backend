import Notification from "../models/Notification.js";
import User from "../models/User.js";

export async function notifyAssignee(leads, assigned, actor) {
  if (!leads.length) return;
  const recipient = await User.findOne({
    name: assigned,
    status: "Active",
    role: { $in: ["Team Lead", "Sales Executive"] },
  }).select("_id");
  if (!recipient || String(recipient._id) === String(actor._id)) return;

  await Notification.insertMany(leads.map((lead) => ({
    recipient: recipient._id,
    lead: lead._id,
    leadCustomId: lead.customId,
    message: `${actor.name} assigned ${lead.name} to you`,
  })));
}

export async function notifyAssigneeSafely(leads, assigned, actor) {
  try {
    await notifyAssignee(leads, assigned, actor);
  } catch (error) {
    console.error("Could not save assignment notification:", error);
  }
}
