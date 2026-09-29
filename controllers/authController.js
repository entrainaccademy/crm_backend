import jwt from "jsonwebtoken";
import User from "../models/User.js";

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "crm_jwt_secret_key", {
    expiresIn: "30d",
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        success: true,
        data: {
          _id: user._id,
          customId: user.customId,
          name: user.name,
          email: user.email,
          role: user.role,
          team: user.team,
          token: generateToken(user._id),
        },
      });
    } else {
      res.status(401).json({ success: false, message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { name, email, password, role, team } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const highestUser = await User.findOne().sort("-customId");
    const nextCustomId = (highestUser?.customId || 0) + 1;

    const user = await User.create({
      customId: nextCustomId,
      name,
      short: name.split(" ")[0],
      email,
      password: password || "crm123",
      role: role || "Sales Executive",
      team: team || "Team Alpha",
    });

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        customId: user.customId,
        name: user.name,
        email: user.email,
        role: user.role,
        team: user.team,
        token: generateToken(user._id),
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
