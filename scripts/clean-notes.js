import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Call from "../models/Call.js";

async function cleanLegacyNotes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas");

    const calls = await Call.find();
    let cleanedCount = 0;
    for (const call of calls) {
      if (
        call.notes &&
        (call.notes === "[object Object]" ||
          call.notes.includes("[object Object]"))
      ) {
        call.notes = call.notes.replaceAll("[object Object]", "").trim();
        await call.save();
        cleanedCount++;
      }
    }

    console.log(`Cleaned ${cleanedCount} calls with [object Object] in notes.`);
    process.exit(0);
  } catch (err) {
    console.error("Cleanup error:", err);
    process.exit(1);
  }
}

cleanLegacyNotes();
