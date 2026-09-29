import express from "express";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getLeaderboard,
} from "../controllers/userController.js";

const router = express.Router();

router.route("/").get(getUsers).post(createUser);
router.get("/leaderboard", getLeaderboard);
router.route("/:id").put(updateUser).delete(deleteUser);

export default router;
