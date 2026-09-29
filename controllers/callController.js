import Call from "../models/Call.js";

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
    const call = await Call.create(req.body);
    res.status(201).json({ success: true, data: call });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a call log
// @route   DELETE /api/calls/:id
export const deleteCall = async (req, res) => {
  try {
    const call = await Call.findByIdAndDelete(req.params.id);
    if (!call) {
      return res.status(404).json({ success: false, message: "Call log not found" });
    }
    res.json({ success: true, message: "Call log deleted", data: call });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
