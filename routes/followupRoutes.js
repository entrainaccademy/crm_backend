import express from "express";
import {
  getFollowups,
  createFollowup,
  updateFollowup,
  toggleFollowupComplete,
  deleteFollowup,
} from "../controllers/followupController.js";

const router = express.Router();

router.route("/").get(getFollowups).post(createFollowup);
router.route("/:id").put(updateFollowup).delete(deleteFollowup);
router.patch("/:id/toggle", toggleFollowupComplete);

export default router;
