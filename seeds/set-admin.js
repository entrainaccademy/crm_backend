import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";

const setupSuperAdmin = async () => {
  try {
    await connectDB();
    const email = "admin@entrain.in";
    const password = "pass";

    let user = await User.findOne({ email });
    if (user) {
      user.password = password;
      user.role = "Super Admin";
      user.status = "Active";
      await user.save();
      console.log(`✅ Super Admin password updated successfully for ${email}`);
    } else {
      user = await User.create({
        customId: 1,
        name: "Admin User",
        short: "Admin",
        email,
        password,
        role: "Super Admin",
        status: "Active",
      });
      console.log(`✅ Super Admin account created successfully for ${email}`);
    }
    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting Super Admin:", error);
    process.exit(1);
  }
};

setupSuperAdmin();
