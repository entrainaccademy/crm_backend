import mongoose from "mongoose";
import Course from "../models/Course.js";

const managers = ["Super Admin", "Data Analytics Manager"];
const editableFields = ["name", "fee", "duration", "description", "status"];

const courseInput = (body, creating = false) => {
  const data = Object.fromEntries(editableFields.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));
  if (data.name !== undefined) data.name = String(data.name).trim();
  if (data.duration !== undefined) data.duration = String(data.duration).trim();
  if (data.description !== undefined) data.description = String(data.description).trim();
  if (data.fee !== undefined) data.fee = data.fee === null || data.fee === "" ? NaN : Number(data.fee);
  if (creating) data.status = "Active";
  return data;
};

const inputError = (data, creating = false) => {
  if ((creating || data.name !== undefined) && !data.name) return "Enter a course name";
  if ((creating || data.fee !== undefined) && (!Number.isFinite(data.fee) || data.fee < 0)) return "Enter a valid course fee";
  if (data.status !== undefined && !["Active", "Inactive"].includes(data.status)) return "Invalid course status";
  return null;
};

const saveError = (res, error) => res.status(400).json({ success: false, message: error.code === 11000 ? "A course with this name already exists" : error.message });

export const getCourses = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === "true" && managers.includes(req.user.role);
    const courses = await Course.find(includeInactive ? {} : { status: "Active" }).sort({ name: 1 });
    res.json({ success: true, data: courses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCourse = async (req, res) => {
  try {
    const data = courseInput(req.body, true);
    const error = inputError(data, true);
    if (error) return res.status(400).json({ success: false, message: error });
    const course = await Course.create(data);
    res.status(201).json({ success: true, data: course });
  } catch (error) {
    saveError(res, error);
  }
};

export const updateCourse = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: "Course not found" });
    const data = courseInput(req.body);
    const error = inputError(data);
    if (error) return res.status(400).json({ success: false, message: error });
    const course = await Course.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });
    res.json({ success: true, data: course });
  } catch (error) {
    saveError(res, error);
  }
};

// Keep historical lead names intact while removing the course from new lead choices.
export const deleteCourse = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: "Course not found" });
    const course = await Course.findByIdAndUpdate(req.params.id, { status: "Inactive" }, { new: true });
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });
    res.json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Permanently remove a course record. Leads retain their stored course name.
export const permanentlyDeleteCourse = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: "Course not found" });
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });
    res.json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
