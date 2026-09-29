import Task from "../models/Task.js";
import User from "../models/User.js";

const teamNames = async (user) =>
  (await User.find({ team: user.team }).select("name")).map((member) => member.name);

// @desc    Get all tasks
// @route   GET /api/tasks
export const getTasks = async (req, res) => {
  try {
    const { assignedTo, status, priority } = req.query;
    const query = {};

    if (assignedTo && assignedTo !== "All") query.assignedTo = assignedTo;
    if (status && status !== "All") query.status = status;
    if (priority && priority !== "All") query.priority = priority;
    if (req.user.role === "Team Leader") query.assignedTo = { $in: await teamNames(req.user) };

    const tasks = await Task.find(query).sort("-createdAt");
    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a task
// @route   POST /api/tasks
export const createTask = async (req, res) => {
  try {
    if (req.user.role === "Team Leader" && !(await User.exists({ name: req.body.assignedTo, team: req.user.team }))) return res.status(403).json({ success: false, message: "Assignee must be on your team" });
    const task = await Task.create(req.body);
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
export const updateTask = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role === "Team Leader") {
      query.assignedTo = { $in: await teamNames(req.user) };
      if (req.body.assignedTo && !(await User.exists({ name: req.body.assignedTo, team: req.user.team }))) return res.status(403).json({ success: false, message: "Assignee must be on your team" });
    }
    const task = await Task.findOneAndUpdate(query, req.body, {
      new: true,
    });
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
export const deleteTask = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role === "Team Leader") query.assignedTo = { $in: await teamNames(req.user) };
    const task = await Task.findOneAndDelete(query);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }
    res.json({ success: true, message: "Task removed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
