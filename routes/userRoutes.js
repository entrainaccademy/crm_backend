import express from "express";
import { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getLeaderboard,
} from "../controllers/userController.js";

const router = express.Router();

router.route("/").get(authorizeRoles("Super Admin", "Manager", "HR", "Data Analytics Manager", "Team Leader"), getUsers).post(authorizeRoles("Super Admin"), createUser);
router.get("/leaderboard", getLeaderboard);
router.route("/:id").put(authorizeRoles("Super Admin"), updateUser).delete(authorizeRoles("Super Admin"), deleteUser);

export default router;
