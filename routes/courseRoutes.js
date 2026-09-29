import express from "express";
import {
  getCourses,
  createCourse,
  updateCourse,
} from "../controllers/courseController.js";

const router = express.Router();

router.route("/").get(getCourses).post(createCourse);
router.route("/:id").put(updateCourse);

export default router;
