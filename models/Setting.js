import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: "ENTRAIN" },
    companyEmail: { type: String, default: "admissions@entrain.in" },
    companyPhone: { type: String, default: "+91 98470 12000" },
    currency: { type: String, default: "INR" },
    currencySymbol: { type: String, default: "₹" },
    timezone: { type: String, default: "Asia/Kolkata" },
    autoAssignLeads: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
    whatsappNotifications: { type: Boolean, default: true },
    sources: [String],
    statuses: [String],
  },
  { timestamps: true }
);

const Setting = mongoose.model("Setting", settingSchema);

export default Setting;
