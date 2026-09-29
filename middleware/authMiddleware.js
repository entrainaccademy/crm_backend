import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    try {
      if (!process.env.JWT_SECRET) throw new Error("JWT secret is not configured");
      const decoded = jwt.verify(req.headers.authorization.split(" ")[1], process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user || req.user.status !== "Active") {
        return res.status(401).json({ success: false, message: "Account is unavailable" });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ success: false, message: "Not authorized, token invalid or expired" });
    }
  }

  return res.status(401).json({ success: false, message: "Not authorized, no token provided" });
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role (${req.user?.role || "Guest"}) is not allowed to access this resource`,
      });
    }
    next();
  };
};
