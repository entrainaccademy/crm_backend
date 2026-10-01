import express from "express";
import { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getFollowups,
  createFollowup,
  updateFollowup,
  toggleFollowupComplete,
  deleteFollowup,
} from "../controllers/followupController.js";

const router = express.Router();
router.use(authorizeRoles("Super Admin", "Manager", "Data Analytics Manager", "Team Lead", "Sales Executive"));

const canWrite = authorizeRoles("Manager", "Data Analytics Manager", "Team Lead", "Sales Executive");
router.route("/").get(getFollowups).post(canWrite, createFollowup);
router.route("/:id").put(canWrite, updateFollowup).delete(canWrite, deleteFollowup);
router.patch("/:id/toggle", canWrite, toggleFollowupComplete);

export default router;
