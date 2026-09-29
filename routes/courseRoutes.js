import express from "express";
import { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getCourses,
  createCourse,
  updateCourse,
} from "../controllers/courseController.js";

const router = express.Router();

router.route("/").get(getCourses).post(authorizeRoles("Super Admin"), createCourse);
router.route("/:id").put(authorizeRoles("Super Admin"), updateCourse);

export default router;
