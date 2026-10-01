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

router.route("/").get(authorizeRoles("Super Admin", "Manager", "HR", "Data Analytics Manager", "Team Lead"), getUsers).post(authorizeRoles("Super Admin", "Data Analytics Manager"), createUser);
router.get("/leaderboard", getLeaderboard);
router.route("/:id").put(authorizeRoles("Super Admin", "Data Analytics Manager"), updateUser).delete(authorizeRoles("Super Admin", "Data Analytics Manager"), deleteUser);

export default router;
