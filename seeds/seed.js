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



const sources = [
  "Meta Ads",
  "Instagram",
  "Facebook",
  "Website",
  "WhatsApp",
  "Referral",
  "Walk-in",
  "Other",
];

const statuses = [
  "New",
  "Contacted",
  "Follow-up",
  "Interested",
  "Quotation",
  "Won",
  "Lost",
];

const names = [
  "Aditya Sharma",
  "Fatima Ahmed",
  "Vikram Nair",
  "Priya Menon",
  "Rahul Verma",
  "Aisha Khan",
  "Arjun Reddy",
  "Neha Kapoor",
  "Sanjay Kumar",
  "Meera Iyer",
  "Rohit Joshi",
  "Sara Thomas",
  "Karthik Rao",
  "Divya Shah",
  "Imran Ali",
  "Pooja Desai",
  "Nikhil Nair",
  "Ananya Singh",
  "Zoya Hassan",
  "Dev Patel",
];

const seedDB = async () => {
  try {
    if (!process.env.SEED_USER_PASSWORD || process.env.SEED_USER_PASSWORD.length < 12) {
      throw new Error("Set SEED_USER_PASSWORD to a password of at least 12 characters before seeding");
    }
    await connectDB();
    console.log("🌱 Seeding MongoDB Atlas...");

    // Clear existing
    await User.deleteMany();
    await Course.deleteMany();
    await Lead.deleteMany();
    await Followup.deleteMany();
    await Call.deleteMany();
    await Task.deleteMany();

    console.log("✅ Cleared old collections");

    // Seed Courses
    await Course.insertMany(seedCourses);
    console.log("✅ Courses seeded");

    // Seed Users
    const createdUsers = [];
    for (const u of seedUsers) {
      const user = await User.create({ ...u, password: process.env.SEED_USER_PASSWORD });
      createdUsers.push(user);
    }
    console.log("✅ Users seeded");

    // Seed Leads
    const createdLeads = [];
    for (let i = 0; i < names.length; i++) {
      const courseName = seedCourses[i % seedCourses.length].name;
      const courseFee = seedCourses[i % seedCourses.length].fee;
      const assignedExec = seedUsers[i % 8];
      const status = statuses[i % statuses.length];
      const saleAmount = courseFee;
      const advanceAmount = status === "Won" ? Math.round((saleAmount * 0.25) / 1000) * 1000 : 0;

      const lead = await Lead.create({
        customId: i + 1,
        name: names[i],
        phone: `+91 ${98470 + i * 13} ${12000 + i * 117}`,
        whatsapp: `+91 ${98470 + i * 13} ${12000 + i * 117}`,
        email: `${names[i].toLowerCase().replace(/ /g, ".")}@gmail.com`,
        location: ["Kochi, Kerala", "Bengaluru, Karnataka", "Mumbai, Maharashtra", "Chennai, Tamil Nadu"][i % 4],
        service: courseName,
        source: sources[i % sources.length],
        assigned: assignedExec.name,
        status,
        priority: ["High", "Medium", "Low"][i % 3],
        created: `2026-09-${String(10 + (i % 18)).padStart(2, "0")}`,
        date: `2026-09-${String(27 + (i % 4)).padStart(2, "0")}`,
        time: ["10:30", "11:00", "14:30", "16:00"][i % 4],
        saleAmount,
        advanceAmount,
        activities: [
          { text: `Lead created from ${sources[i % sources.length]}`, time: "24 Sep 2026 · 10:00 AM" },
          { text: `Assigned to ${assignedExec.name}`, time: "24 Sep 2026 · 10:15 AM" },
          { text: "Introductory call completed", time: "25 Sep 2026 · 11:30 AM" },
          { text: "Follow-up scheduled", time: "26 Sep 2026 · 02:00 PM" },
        ],
      });
      createdLeads.push(lead);
    }
    console.log("✅ Leads seeded");

    // Seed Followups
    for (let i = 0; i < 12; i++) {
      const l = createdLeads[i];
      await Followup.create({
        leadId: l.customId,
        leadRef: l._id,
        name: l.name,
        phone: l.phone,
        whatsapp: l.whatsapp,
        email: l.email,
        location: l.location,
        service: l.service,
        source: l.source,
        assigned: l.assigned,
        status: l.status,
        priority: l.priority,
        purpose: [
          "Discuss course options",
          "Course counselling",
          "Discuss course fees",
          "Admission follow-up",
        ][i % 4],
        type: "Call",
        date: l.date,
        time: l.time,
        completed: false,
      });
    }
    console.log("✅ Follow-ups seeded");

    // Seed Calls
    for (let i = 0; i < 15; i++) {
      const l = createdLeads[i];
      await Call.create({
        leadId: l.customId,
        leadRef: l._id,
        name: l.name,
        phone: l.phone,
        direction: i % 3 ? "Outgoing" : "Incoming",
        duration: i % 4 ? "05:14" : "00:00",
        callStatus: i % 4 ? "Answered" : "Missed",
        callDate: "28 Sep 2026",
        callTime: `${10 + (i % 8)}:32 AM`,
        service: l.service,
        assigned: l.assigned,
      });
    }
    console.log("✅ Call logs seeded");

    // Seed Tasks
    const sampleTasks = [
      { title: "Review Q3 Admissions Pipeline", description: "Audit won vs lost leads for Chef Diploma", assignedTo: "Rahul Menon", priority: "High", status: "Pending" },
      { title: "Call high-priority WhatsApp inquiries", description: "Follow up with 5 pending counseling calls", assignedTo: "Mohammed Ali", priority: "High", status: "In Progress" },
      { title: "Prepare Monthly Revenue Report", description: "Summarize total collections across all sales executives", assignedTo: "Admin User", priority: "Medium", status: "Pending" },
    ];
    await Task.insertMany(sampleTasks);
    console.log("✅ Tasks seeded");

    console.log("\n🎉 Database Seeding Completed Successfully! \n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding Error:", error);
    process.exit(1);
  }
};

seedDB();
