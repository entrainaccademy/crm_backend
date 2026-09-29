import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    fee: { type: Number, required: true },
    duration: { type: String, default: "6 Months" },
    description: { type: String, default: "" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", courseSchema);

export default Course;
