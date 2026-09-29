import express from "express";
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  addLeadNote,
  batchAssignLeads,
} from "../controllers/leadController.js";

const router = express.Router();

router.route("/").get(getLeads).post(createLead);
router.post("/batch-assign", batchAssignLeads);
router.route("/:id").get(getLeadById).put(updateLead).delete(deleteLead);
router.route("/:id/notes").post(addLeadNote);

export default router;
