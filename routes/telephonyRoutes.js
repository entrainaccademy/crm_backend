import express from "express";
import { verifyTwilioWebhook } from "../middleware/verifyTwilioWebhook.js";
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
router.all("/webhook/twiml", verifyTwilioWebhook, serveTwiml);
router.post("/webhook/status", verifyTwilioWebhook, handleStatusWebhook);
router.post("/webhook/dial-action", verifyTwilioWebhook, handleDialActionWebhook);
router.post("/webhook/recording", verifyTwilioWebhook, handleRecordingWebhook);

export default router;
