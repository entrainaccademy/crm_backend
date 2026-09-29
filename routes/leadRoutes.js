import express from "express";
import { authorizeRoles } from "../middleware/authMiddleware.js";
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
router.use(authorizeRoles("Super Admin", "Manager", "Data Analytics Manager", "Team Lead", "Sales Executive"));

const canWrite = authorizeRoles("Super Admin", "Manager", "Sales Executive");
router.route("/").get(getLeads).post(canWrite, createLead);
router.post("/batch-assign", authorizeRoles("Super Admin", "Manager"), batchAssignLeads);
router.route("/:id").get(getLeadById).put(canWrite, updateLead).delete(authorizeRoles("Super Admin", "Manager"), deleteLead);
router.route("/:id/notes").post(canWrite, addLeadNote);

export default router;
