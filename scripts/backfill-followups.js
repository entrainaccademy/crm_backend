import dotenv from "dotenv";
import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import Followup from "../models/Followup.js";
import { ensureLeadFollowup } from "../utils/followupSchedule.js";

dotenv.config();

const apply = process.argv.includes("--apply");

try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const leads = await Lead.find({ date: { $nin: [null, ""] }, customId: { $exists: true } });
  let missing = 0;

  for (const lead of leads) {
    const exists = await Followup.exists({ leadId: lead.customId, completed: false });
    if (exists) continue;
    missing += 1;
    if (apply) await ensureLeadFollowup(lead);
  }

  console.log(`${apply ? "Created" : "Would create"} ${missing} follow-up records.`);
} catch (error) {
  console.error(`Follow-up backfill failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
