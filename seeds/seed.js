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
  name: process.env.BOOTSTRAP_ADMIN_NAME || "Admin User",
  short: "Admin",
  email: (process.env.BOOTSTRAP_ADMIN_EMAIL || "admin@entrain.in").trim().toLowerCase(),
  password: process.env.BOOTSTRAP_ADMIN_PASSWORD || "pass",
  phone: "+91 98470 12000",
  role: "Super Admin",
  team: "Management",
  leader: "",
  target: 1000000,
  sales: 0,
  conversions: 0,
  status: "Active",
};

const seedDB = async () => {
  try {
    await connectDB();
    console.log("🌱 Initializing clean workspace database...");

    // Clear operational collections (leads, followups, calls, tasks)
    await Lead.deleteMany({});
    await Followup.deleteMany({});
    await Call.deleteMany({});
    await Task.deleteMany({});
    console.log("✅ Cleared operational collections (no dummy leads, calls, or follow-ups).");

    // Initialize/sync official courses
    await Course.deleteMany({});
    await Course.insertMany(seedCourses);
    console.log(`✅ Seeded ${seedCourses.length} official courses.`);

    // Ensure Super Admin account exists
    const existingAdmin = await User.findOne({ email: defaultAdmin.email });
    if (!existingAdmin) {
      await User.create(defaultAdmin);
      console.log(`✅ Created Super Admin account (${defaultAdmin.email}).`);
    } else {
      existingAdmin.role = "Super Admin";
      existingAdmin.status = "Active";
      await existingAdmin.save();
      console.log(`✅ Super Admin account verified (${defaultAdmin.email}).`);
    }

    console.log("\n🎉 Database initialization complete! Clean workspace ready for production data.\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding Error:", error);
    process.exit(1);
  }
};

seedDB();
