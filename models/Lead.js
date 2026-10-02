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
        "Facebook",
        "WhatsApp",
        "Instagram",
        "Direct",
        "Other",
        "Referral",
        "Meta Ads",
        "Website",
        "Walk-in",
      ],
      default: "Facebook",
    },
    assigned: { type: String, default: "Unassigned" },
    status: {
      type: String,
      enum: [
        "",
        "Contacted",
        "Follow-up",
        "Qualified",
        "Converted",
        "Not Qualified",
        "Lost",
        "New",
        "Interested",
        "Quotation",
        "Won",
      ],
      default: "",
      index: true,
    },
    convertedAt: { type: Date, default: null },
    priority: {
      type: String,
      enum: ["", "Cool", "Cold", "Warm", "Hot", "High", "Medium", "Low"],
      default: "Cool",
    },
    saleAmount: { type: Number, default: 0 },
    advanceAmount: { type: Number, default: 0 },
    created: { type: String, default: () => new Date().toISOString().split("T")[0] },
    date: { type: String, default: "" },
    time: { type: String, default: "" },
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
