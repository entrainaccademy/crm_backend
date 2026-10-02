import User from "../models/User.js";
import Lead from "../models/Lead.js";

const accountRoles = ["Super Admin", "Data Analytics Manager", "Team Lead", "Sales Executive"];

// @desc    Get all users
// @route   GET /api/users
export const getUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    const query = {};

    if (role && role !== "All") query.role = role;
    if (req.user.role === "Team Lead") query.role = { $in: ["Sales Executive", "Team Lead"] };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const fields = req.user.role === "Team Lead"
      ? "name short target sales conversions role status"
      : "-password";
    const users = await User.find(query).select(fields).sort("name");

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get leaderboard
// @route   GET /api/users/leaderboard
export const getLeaderboard = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;
    if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime())) || (start && end && start > end)) {
      return res.status(400).json({ success: false, message: "Choose a valid date range" });
    }
    const users = await User.find({
      status: "Active",
      role: { $in: ["Team Lead", "Sales Executive"] },
      leaderboardVisible: { $ne: false },
    }).select("name short target role status leaderboardVisible");
    const totals = await Lead.aggregate([
      { $match: { assigned: { $in: users.map((user) => user.name) }, status: { $in: ["Converted", "Won"] } } },
      { $addFields: { conversionDate: { $ifNull: ["$convertedAt", "$updatedAt"] } } },
      ...(start || end ? [{ $match: { conversionDate: { ...(start ? { $gte: start } : {}), ...(end ? { $lte: end } : {}) } } }] : []),
      { $group: { _id: "$assigned", sales: { $sum: "$saleAmount" }, conversions: { $sum: 1 } } },
    ]);
    const byName = new Map(totals.map((entry) => [entry._id, entry]));
    const ranked = users.map((user) => ({
      ...user.toObject(),
      sales: byName.get(user.name)?.sales || 0,
      conversions: byName.get(user.name)?.conversions || 0,
    })).sort((a, b) =>
      b.sales / Math.max(1, b.target) - a.sales / Math.max(1, a.target) || b.sales - a.sales
    );

    res.json({
      success: true,
      data: ranked,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create user
// @route   POST /api/users
export const createUser = async (req, res) => {
  try {
    const { email, name, role, target, phone, password } = req.body;
    if (role && !accountRoles.includes(role)) {
      return res.status(400).json({ success: false, message: "Choose one of the four supported account roles" });
    }
    if (!name || !email || !password || password.length < 8) {
      return res.status(400).json({ success: false, message: "Name, email and a password of at least 8 characters are required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: "User with this email already exists" });
    }
    if (role === "Team Lead" && await User.exists({ role: "Team Lead" })) {
      return res.status(409).json({ success: false, message: "Only one Team Lead account is allowed" });
    }

    const highestUser = await User.findOne().sort("-customId");
    const nextCustomId = (highestUser?.customId || 0) + 1;

    const user = await User.create({
      customId: nextCustomId,
      name,
      short: name.split(" ")[0],
      email,
      phone,
      role: role || "Sales Executive",
      target: Number(target) || 500000,
      password,
    });

    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({ success: true, data: userObj });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.role) {
      return res.status(409).json({ success: false, message: "Only one Team Lead account is allowed" });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const query = isNaN(id) ? { _id: id } : { customId: Number(id) };

    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (req.body.role && !accountRoles.includes(req.body.role) && req.body.role !== user.role) {
      return res.status(400).json({ success: false, message: "Choose one of the four supported account roles" });
    }
    if (req.body.role === "Team Lead" && user.role !== "Team Lead" && await User.exists({ role: "Team Lead" })) {
      return res.status(409).json({ success: false, message: "Only one Team Lead account is allowed" });
    }

    if (req.body.target !== undefined && (!Number.isFinite(Number(req.body.target)) || Number(req.body.target) <= 0)) {
      return res.status(400).json({ success: false, message: "Target must be greater than zero" });
    }
    if (req.body.leaderboardVisible !== undefined && typeof req.body.leaderboardVisible !== "boolean") {
      return res.status(400).json({ success: false, message: "Leaderboard visibility must be true or false" });
    }
    const allowed = ["name", "email", "phone", "role", "target", "status", "leaderboardVisible"];
    for (const key of allowed) if (req.body[key] !== undefined) user[key] = req.body[key];
    if (req.body.password) {
      if (req.body.password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
      user.password = req.body.password;
    }
    await user.save();

    res.json({ success: true, data: user.toJSON({ transform: (_, value) => { delete value.password; return value; } }) });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.role) {
      return res.status(409).json({ success: false, message: "Only one Team Lead account is allowed" });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const query = isNaN(id) ? { _id: id } : { customId: Number(id) };

    const user = await User.findOneAndDelete(query);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User removed successfully", data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
