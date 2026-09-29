import jwt from "jsonwebtoken";
import User from "../models/User.js";

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT secret is not configured");
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && user.status === "Active" && password && (await user.matchPassword(password))) {
      if (!User.schema.path("role").enumValues.includes(user.role)) {
        return res.status(403).json({ success: false, message: "Account role is no longer supported. Contact your administrator." });
      }
      res.json({
        success: true,
        data: {
          _id: user._id,
          customId: user.customId,
          name: user.name,
          email: user.email,
          role: user.role,
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
