import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    leadId: { type: Number },
    leadRef: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    direction: {
      type: String,
      enum: ["Outgoing", "Incoming"],
      default: "Outgoing",
    },
    duration: { type: String, default: "00:00" },
    callStatus: {
      type: String,
      enum: ["Answered", "Missed", "Busy", "Disconnected", "Voicemail"],
      default: "Answered",
    },
    callDate: { type: String, default: () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) },
    callTime: { type: String, default: () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) },
    service: { type: String, default: "" },
    assigned: { type: String, default: "Unassigned" },
    notes: { type: String, default: "" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Call = mongoose.model("Call", callSchema);

export default Call;
