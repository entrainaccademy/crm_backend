import express from "express";
import { login, getMe, updateMe } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.get("/me", protect, getMe);
router.patch("/me", protect, updateMe);

export default router;
