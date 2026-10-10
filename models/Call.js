import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    leadId: { type: Number, index: true },
    leadRef: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true }, // Customer phone
    agentPhone: { type: String, trim: true }, // Executive's phone
    direction: {
      type: String,
      enum: ["Outgoing", "Incoming"],
      default: "Outgoing",
    },
    duration: { type: String, default: "00:00" }, // Formatted mm:ss
    durationSeconds: { type: Number, default: 0 },
    callStatus: {
      type: String,
      enum: [
        "Answered",
        "Missed",
        "Busy",
        "Disconnected",
        "Voicemail",
        "Initiated",
        "Ringing",
        "In Progress",
        "Completed",
        "Failed",
        "No Answer",
        "Canceled",
      ],
      default: "Answered",
    },
    callType: {
      type: String,
      enum: ["telephony", "manual"],
      default: "manual",
    },
    callDate: {
      type: String,
      default: () =>
        new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
    },
    callTime: {
      type: String,
      default: () =>
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
    service: { type: String, default: "" },
    assigned: { type: String, default: "Unassigned" },
    executiveId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: { type: String, default: "" },

    // Provider Telephony & Recording fields
    provider: { type: String, default: "twilio" },
    providerCallId: { type: String, index: true, sparse: true },
    providerLeg1Sid: { type: String, sparse: true },
    providerLeg2Sid: { type: String, sparse: true },
    recordingSid: { type: String, index: true, sparse: true },
    recordingUrl: { type: String, default: "" }, // Kept private, streamed securely through backend
    recordingDuration: { type: Number, default: 0 },
    recordingStatus: {
      type: String,
      enum: ["Processing", "Available", "Failed", "Not recorded", "Pending"],
      default: "Not recorded",
    },
    recordingError: { type: String, default: "" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual id for frontend compatibility
callSchema.virtual("id").get(function () {
  return this._id?.toString();
});

const Call = mongoose.model("Call", callSchema);

export default Call;

