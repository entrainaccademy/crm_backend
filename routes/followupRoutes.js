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
router.use(authorizeRoles("Super Admin", "Manager", "Data Analytics Manager", "Team Leader", "Sales Executive"));

const canWrite = authorizeRoles("Super Admin", "Manager", "Team Leader", "Sales Executive");
router.route("/").get(getFollowups).post(canWrite, createFollowup);
router.route("/:id").put(canWrite, updateFollowup).delete(canWrite, deleteFollowup);
router.patch("/:id/toggle", canWrite, toggleFollowupComplete);

export default router;
