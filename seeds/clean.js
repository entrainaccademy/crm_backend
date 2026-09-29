import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Lead from "../models/Lead.js";
import Followup from "../models/Followup.js";
import Call from "../models/Call.js";
import Course from "../models/Course.js";
import Task from "../models/Task.js";

const seedCourses = [
  { name: "Professional Chef Diploma", fee: 180000, duration: "1 Year" },
  { name: "Bakery & Patisserie Diploma", fee: 150000, duration: "1 Year" },
  { name: "Culinary Arts Certificate", fee: 85000, duration: "6 Months" },
  { name: "Advanced Baking Certificate", fee: 65000, duration: "6 Months" },
  { name: "Food Production & Kitchen Management", fee: 120000, duration: "9 Months" },
  { name: "Barista & Beverage Arts", fee: 45000, duration: "3 Months" },
];

const defaultAdmin = {
  customId: 1,
  name: "Admin User",
  short: "Admin",
  email: "admin@entrain.in",
  phone: "+91 98470 12000",
  role: "Super Admin",
  team: "Management",
  leader: "",
  target: 1000000,
  sales: 0,
  conversions: 0,
};

const cleanDB = async () => {
  try {
    await connectDB();
    console.log("🧹 Clearing all dummy data from MongoDB Atlas...");

    // Remove all dummy operational data
    const leadsRes = await Lead.deleteMany({});
    const followupsRes = await Followup.deleteMany({});
    const callsRes = await Call.deleteMany({});
    const tasksRes = await Task.deleteMany({});

    console.log(`✅ Removed ${leadsRes.deletedCount} dummy leads.`);
    console.log(`✅ Removed ${followupsRes.deletedCount} dummy follow-ups.`);
    console.log(`✅ Removed ${callsRes.deletedCount} dummy calls.`);
    console.log(`✅ Removed ${tasksRes.deletedCount} dummy tasks.`);

    // Ensure courses exist
    const courseCount = await Course.countDocuments();
    if (courseCount === 0) {
      await Course.insertMany(seedCourses);
      console.log("✅ Default course catalog initialized.");
    }

    // Ensure at least default Admin exists
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.create(defaultAdmin);
      console.log("✅ Default admin user created.");
    }

    console.log("\n🎉 All dummy data removed successfully! Database is now clean.\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error cleaning database:", error);
    process.exit(1);
  }
};

cleanDB();
