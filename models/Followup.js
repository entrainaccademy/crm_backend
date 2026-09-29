import mongoose from "mongoose";

const followupSchema = new mongoose.Schema(
  {
    leadId: { type: Number, index: true },
    leadRef: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    email: { type: String, trim: true },
    location: { type: String, trim: true },
    service: { type: String, trim: true },
    source: { type: String, default: "Website" },
    assigned: { type: String, default: "Unassigned" },
    status: { type: String, default: "Follow-up" },
    priority: { type: String, default: "Medium" },
    purpose: {
      type: String,
      default: "Course counselling",
    },
    type: {
      type: String,
      enum: ["Call", "Meeting", "WhatsApp", "Email", "Demo"],
      default: "Call",
    },
    date: { type: String, default: () => new Date().toISOString().split("T")[0] },
    time: { type: String, default: "11:00" },
    completed: { type: Boolean, default: false, index: true },
    completedAt: { type: Date },
    notes: { type: String, default: "" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

followupSchema.virtual("id").get(function () {
  return this.leadId || this._id;
});

const Followup = mongoose.model("Followup", followupSchema);

export default Followup;
