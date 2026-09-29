import express from "express";
import { authorizeRoles } from "../middleware/authMiddleware.js";
import { getDashboardStats } from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/stats", authorizeRoles("Super Admin", "Manager", "Data Analytics Manager", "Team Lead"), getDashboardStats);

export default router;
