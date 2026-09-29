import Call from "../models/Call.js";
import { isExecutive } from "../middleware/scope.js";

// @desc    Get all call logs
// @route   GET /api/calls
export const getCalls = async (req, res) => {
  try {
    const { search, status, direction, assigned } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { service: { $regex: search, $options: "i" } },
      ];
    }

    if (status && status !== "All") query.callStatus = status;
    if (direction && direction !== "All") query.direction = direction;
    if (assigned && assigned !== "All") query.assigned = assigned;

    if (isExecutive(req.user)) query.assigned = req.user.name;
    const calls = await Call.find(query).sort("-createdAt");

    res.json({
      success: true,
      count: calls.length,
      data: calls,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Log a new call
// @route   POST /api/calls
export const logCall = async (req, res) => {
  try {
    const data = { ...req.body };
    if (isExecutive(req.user)) data.assigned = req.user.name;
    const call = await Call.create(data);
    res.status(201).json({ success: true, data: call });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a call log
// @route   DELETE /api/calls/:id
export const deleteCall = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    const call = await Call.findOneAndDelete(query);
    if (!call) {
      return res.status(404).json({ success: false, message: "Call log not found" });
    }
    res.json({ success: true, message: "Call log deleted", data: call });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
