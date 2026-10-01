import express from "express";
import { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getCourses,
  createCourse,
  updateCourse,
} from "../controllers/courseController.js";

const router = express.Router();

router.route("/").get(getCourses).post(authorizeRoles("Super Admin", "Data Analytics Manager"), createCourse);
router.route("/:id").put(authorizeRoles("Super Admin", "Data Analytics Manager"), updateCourse);

export default router;
