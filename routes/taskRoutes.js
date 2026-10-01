import express from "express";
import { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";

const router = express.Router();

router.route("/").get(authorizeRoles("Super Admin", "Manager", "HR", "Data Analytics Manager"), getTasks).post(authorizeRoles("Super Admin", "Manager", "HR", "Data Analytics Manager"), createTask);
router.route("/:id").put(authorizeRoles("Super Admin", "Manager", "HR", "Data Analytics Manager"), updateTask).delete(authorizeRoles("Super Admin", "Manager", "HR", "Data Analytics Manager"), deleteTask);

export default router;
