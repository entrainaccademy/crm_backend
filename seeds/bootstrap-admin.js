import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Workspace Admin";

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || !email || !password || password.length < 12) {
  console.error("Set MONGODB_URI, JWT_SECRET (32+ characters), BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD (12+ characters).");
  process.exit(1);
}

try {
  await mongoose.connect(process.env.MONGODB_URI);
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== "Super Admin") throw new Error("Existing account is not a Super Admin");
    existing.password = password;
    existing.status = "Active";
    await existing.save();
    console.log(`Updated Super Admin password for ${email}.`);
  } else {
    await User.create({ name, short: name.split(" ")[0], email, password, role: "Super Admin" });
    console.log(`Created Super Admin account for ${email}.`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
