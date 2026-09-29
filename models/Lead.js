import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    author: { type: String, default: "System" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const activitySchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    time: { type: String, default: () => new Date().toLocaleString() },
    type: { type: String, default: "action" },
  },
  { _id: true }
);

const leadSchema = new mongoose.Schema(
  {
    customId: { type: Number, unique: true, sparse: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    location: { type: String, trim: true },
    service: { type: String, required: true, trim: true },
    source: {
      type: String,
      enum: [
        "Meta Ads",
        "Instagram",
        "Facebook",
        "Website",
        "WhatsApp",
        "Referral",
        "Walk-in",
        "Other",
      ],
      default: "Meta Ads",
    },
    assigned: { type: String, default: "Unassigned" },
    team: { type: String, default: "Team Alpha" },
    status: {
      type: String,
      enum: [
        "New",
        "Contacted",
        "Follow-up",
        "Interested",
        "Quotation",
        "Won",
        "Lost",
      ],
      default: "New",
      index: true,
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    saleAmount: { type: Number, default: 0 },
    advanceAmount: { type: Number, default: 0 },
    created: { type: String, default: () => new Date().toISOString().split("T")[0] },
    date: { type: String, default: () => new Date().toISOString().split("T")[0] },
    time: { type: String, default: "10:00" },
    notes: [noteSchema],
    activities: [activitySchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual id matching frontend `id`
leadSchema.virtual("id").get(function () {
  return this.customId || this._id;
});

const Lead = mongoose.model("Lead", leadSchema);

export default Lead;
