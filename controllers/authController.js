import jwt from "jsonwebtoken";
import User from "../models/User.js";
import mongoose from "mongoose";
import Lead from "../models/Lead.js";
import Followup from "../models/Followup.js";
import Call from "../models/Call.js";
import Task from "../models/Task.js";

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT secret is not configured");
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && user.status === "Active") {
      if (!password || !(await user.matchPassword(password))) {
        return res.status(401).json({ success: false, message: "Wrong password. Please try again." });
      }
      if (!User.schema.path("role").enumValues.includes(user.role)) {
        return res.status(403).json({ success: false, message: "Account role is no longer supported. Contact your administrator." });
      }
      res.json({
        success: true,
        data: {
          _id: user._id,
          customId: user.customId,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          status: user.status,
          role: user.role,
          token: generateToken(user._id),
        },
      });
    } else {
      res.status(401).json({ success: false, message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// @desc    Get current logged in user profile
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const updateMe = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let profile;
    await session.withTransaction(async () => {
      const user = await User.findById(req.user._id).session(session);
      if (!user) {
        const error = new Error("Account not found");
        error.status = 404;
        throw error;
      }

      const name = String(req.body.name ?? user.name).trim();
      const email = String(req.body.email ?? user.email).trim().toLowerCase();
      const phone = String(req.body.phone ?? user.phone ?? "").trim();
      const newPassword = String(req.body.newPassword || "");
      if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        const error = new Error("Enter a name and valid email address");
        error.status = 400;
        throw error;
      }
      if (phone && !/^[+\d\s()-]{7,20}$/.test(phone)) {
        const error = new Error("Enter a valid phone number");
        error.status = 400;
        throw error;
      }
      if (newPassword && newPassword.length < 8) {
        const error = new Error("New password must be at least 8 characters");
        error.status = 400;
        throw error;
      }
      if (email !== user.email || newPassword) {
        if (!req.body.currentPassword || !(await user.matchPassword(req.body.currentPassword))) {
          const error = new Error("Enter your current password to change email or password");
          error.status = 400;
          throw error;
        }
      }

      const oldName = user.name;
      user.name = name;
      user.short = name.split(/\s+/)[0];
      user.email = email;
      user.phone = phone;
      if (newPassword) user.password = newPassword;
      await user.save({ session });

      if (name !== oldName) {
        await Lead.updateMany({ assigned: oldName }, { $set: { assigned: name } }, { session });
        await Followup.updateMany({ assigned: oldName }, { $set: { assigned: name } }, { session });
        await Call.updateMany({ assigned: oldName }, { $set: { assigned: name } }, { session });
        await Task.updateMany({ assignedTo: oldName }, { $set: { assignedTo: name } }, { session });
      }

      profile = user.toObject({ virtuals: true });
      delete profile.password;
    });
    res.json({ success: true, data: profile });
  } catch (error) {
    const duplicateEmail = error.code === 11000;
    res.status(duplicateEmail ? 409 : error.status || 500).json({
      success: false,
      message: duplicateEmail ? "This email is already in use" : error.message,
    });
  } finally {
    await session.endSession();
  }
};
