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
  { name: "Dessert Workshop", fee: 180000, duration: "1 Month" },
  { name: "One Day Shawarma and Shawai Course", fee: 150000, duration: "1 Day" },
  { name: "One Week Shawarma and Shawai Course", fee: 85000, duration: "1 Week" },
  { name: "One Day Fried Chicken Course", fee: 65000, duration: "1 Day" },
  { name: "One Week Fried Chicken Course", fee: 120000, duration: "1 Week" },
  { name: "One Week Arabian Cuisine Course", fee: 45000, duration: "1 Week" },
];

const defaultAdmin = {
  customId: 1,
  name: "Admin User",
  short: "Admin",
  email: (process.env.ADMIN_EMAIL || process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@entrain.com").trim().toLowerCase(),
  password: process.env.ADMIN_PASSWORD || process.env.BOOTSTRAP_ADMIN_PASSWORD || "entrain@012",
  phone: "+91 98470 12000",
  role: "Super Admin",
  team: "Management",
  leader: "",
  target: 1000000,
  sales: 0,
  conversions: 0,
  status: "Active",
};

const cleanDB = async () => {
  try {
    await connectDB();
    console.log("🧹 Clearing all dummy data and users from MongoDB Atlas...");

    // Remove all operational records
    const leadsRes = await Lead.deleteMany({});
    const followupsRes = await Followup.deleteMany({});
    const callsRes = await Call.deleteMany({});
    const tasksRes = await Task.deleteMany({});

    console.log(`✅ Removed ${leadsRes.deletedCount} leads.`);
    console.log(`✅ Removed ${followupsRes.deletedCount} follow-ups.`);
    console.log(`✅ Removed ${callsRes.deletedCount} calls.`);
    console.log(`✅ Removed ${tasksRes.deletedCount} tasks.`);

    // Remove all dummy users, keep only the Super Admin and afeela
    const usersRes = await User.deleteMany({
      email: { $ne: defaultAdmin.email },
      $and: [
        { email: { $not: /afeela/i } },
        { name: { $not: /afeela/i } }
      ]
    });
    console.log(`✅ Removed ${usersRes.deletedCount} dummy user accounts.`);

    // Ensure Super Admin exists with valid password
    let admin = await User.findOne({ email: defaultAdmin.email });
    if (!admin) {
      admin = await User.create(defaultAdmin);
      console.log(`✅ Created Super Admin account (${defaultAdmin.email}).`);
    } else {
      admin.role = "Super Admin";
      admin.status = "Active";
      admin.password = defaultAdmin.password;
      await admin.save();
      console.log(`✅ Super Admin account verified (${defaultAdmin.email}).`);
    }

    // Ensure official courses catalog is synced
    await Course.deleteMany({});
    await Course.insertMany(seedCourses);
    console.log(`✅ Initialized ${seedCourses.length} official courses.`);

    console.log("\n🎉 All backend data cleared! Database is completely fresh with only Super Admin.\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error cleaning database:", error);
    process.exit(1);
  }
};

cleanDB();
