import User from "../models/User.js";

// @desc    Get all users / team members
// @route   GET /api/users
export const getUsers = async (req, res) => {
  try {
    const { role, team, search } = req.query;
    const query = {};

    if (role && role !== "All") query.role = role;
    if (team && team !== "All") query.team = team;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query).select("-password").sort("name");

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
    const users = await User.find({ status: "Active" }).select("-password");

    const ranked = users.sort((a, b) => {
      const aPct = a.target ? a.sales / a.target : 0;
      const bPct = b.target ? b.sales / b.target : 0;
      return bPct - aPct || b.sales - a.sales;
    });

    res.json({
      success: true,
      data: ranked,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create user / team member
// @route   POST /api/users
export const createUser = async (req, res) => {
  try {
    const { email, name, role, team, leader, target, phone, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: "User with this email already exists" });
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
      team: team || "Team Alpha",
      leader: leader || "",
      target: Number(target) || 500000,
      password: password || "crm123",
    });

    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({ success: true, data: userObj });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const query = isNaN(id) ? { _id: id } : { customId: Number(id) };

    const updates = { ...req.body };
    delete updates.password; // Do not update password here

    const user = await User.findOneAndUpdate(query, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, data: user });
  } catch (error) {
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
