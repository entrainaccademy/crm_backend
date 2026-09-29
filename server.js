import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";
import connectDB from "./config/db.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import followupRoutes from "./routes/followupRoutes.js";
import callRoutes from "./routes/callRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";

// Middleware
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { protect } from "./middleware/authMiddleware.js";

// Connect to MongoDB Atlas
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set to at least 32 characters");
}
connectDB();

const app = express();

// Middleware
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000,http://localhost:3001")
  .split(",").map((origin) => origin.trim());
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)) }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "ENTRAIN CRM Backend API is running smoothly",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/leads", protect, leadRoutes);
app.use("/api/followups", protect, followupRoutes);
app.use("/api/calls", protect, callRoutes);
app.use("/api/users", protect, userRoutes);
app.use("/api/tasks", protect, taskRoutes);
app.use("/api/courses", protect, courseRoutes);
app.use("/api/dashboard", protect, dashboardRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` ENTRAIN CRM Backend Server running in ${process.env.NODE_ENV || "development"} mode on http://localhost:${PORT}`);
});
