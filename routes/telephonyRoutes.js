import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getProviderStatus,
  initiateCall,
  getCallStatus,
  serveTwiml,
  handleStatusWebhook,
  handleDialActionWebhook,
  handleRecordingWebhook,
} from "../controllers/telephonyController.js";

const router = express.Router();

// Protected CRM Endpoints
router.get("/status", protect, getProviderStatus);
router.post(
  "/initiate",
  protect,
  authorizeRoles("Super Admin", "Manager", "Data Analytics Manager", "Team Lead", "Sales Executive"),
  initiateCall
);
router.get("/call/:id/status", protect, getCallStatus);

// Public Provider Webhooks (Called directly by Twilio)
router.all("/webhook/twiml", serveTwiml);
router.post("/webhook/status", handleStatusWebhook);
router.post("/webhook/dial-action", handleDialActionWebhook);
router.post("/webhook/recording", handleRecordingWebhook);

export default router;
