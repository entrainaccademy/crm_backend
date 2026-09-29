import express from "express";
import { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";

const router = express.Router();

router.route("/").get(authorizeRoles("Super Admin", "Manager", "HR", "Team Leader"), getTasks).post(authorizeRoles("Super Admin", "Manager", "HR", "Team Leader"), createTask);
router.route("/:id").put(authorizeRoles("Super Admin", "Manager", "HR", "Team Leader"), updateTask).delete(authorizeRoles("Super Admin", "Manager", "HR", "Team Leader"), deleteTask);

export default router;
