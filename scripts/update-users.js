import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/User.js";

const updateUsers = async () => {
  try {
    await connectDB();

    const adminEmail = "admin@entrain.com";
    const adminPassword = "entrain@012";

    // 1. Update or create Super Admin
    let admin = await User.findOne({ email: adminEmail });
    if (admin) {
      admin.password = adminPassword;
      admin.role = "Super Admin";
      admin.status = "Active";
      await admin.save();
      console.log(`✅ Updated password for ${adminEmail}`);
    } else {
      admin = await User.create({
        customId: 1,
        name: "Admin User",
        short: "Admin",
        email: adminEmail,
        password: adminPassword,
        role: "Super Admin",
        status: "Active",
      });
      console.log(`✅ Created ${adminEmail}`);
    }

    // 2. Remove all users EXCEPT admin@entrain.com and any user matching 'afeela'
    const filter = {
      $and: [
        { email: { $ne: adminEmail } },
        { email: { $not: /afeela/i } },
        { name: { $not: /afeela/i } }
      ]
    };

    const deleteResult = await User.deleteMany(filter);
    console.log(`✅ Removed ${deleteResult.deletedCount} other users.`);

    // 3. Fetch and display all remaining users
    const remainingUsers = await User.find({}).lean();
    console.log(`\n📋 Current users in database (${remainingUsers.length}):`);
    for (const u of remainingUsers) {
      console.log(`- Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, Status: ${u.status}`);
    }

    // 4. Test login authentication
    const testAdmin = await User.findOne({ email: adminEmail });
    const isMatch = await testAdmin.matchPassword(adminPassword);
    console.log(`\n🔑 Verification: Password '${adminPassword}' for '${adminEmail}' matches: ${isMatch ? "SUCCESS ✅" : "FAILED ❌"}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating users:", error);
    process.exit(1);
  }
};

updateUsers();
