import express from "express";
import { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  permanentlyDeleteCourse,
} from "../controllers/courseController.js";

const router = express.Router();

router.route("/").get(getCourses).post(authorizeRoles("Super Admin", "Data Analytics Manager"), createCourse);
router.route("/:id")
  .put(authorizeRoles("Super Admin", "Data Analytics Manager"), updateCourse)
  .delete(authorizeRoles("Super Admin", "Data Analytics Manager"), deleteCourse);
router.delete("/:id/permanent", authorizeRoles("Super Admin", "Data Analytics Manager"), permanentlyDeleteCourse);

export default router;
