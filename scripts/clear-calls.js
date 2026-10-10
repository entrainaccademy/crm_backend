import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Call from "../models/Call.js";

const clearCalls = async () => {
  try {
    await connectDB();
    const countBefore = await Call.countDocuments();
    console.log(`📞 Current call logs in database: ${countBefore}`);

    const result = await Call.deleteMany({});
    console.log(`✅ Successfully cleared ${result.deletedCount} call records from database.`);

    const countAfter = await Call.countDocuments();
    console.log(`📞 Call logs remaining: ${countAfter}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing call history:", error);
    process.exit(1);
  }
};

clearCalls();
