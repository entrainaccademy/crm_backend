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

const canWork = authorizeRoles("Manager", "Data Analytics Manager", "Team Lead", "Sales Executive");
router.route("/").get(getLeads).post(authorizeRoles("Super Admin", "Manager", "Data Analytics Manager", "Team Lead", "Sales Executive"), createLead);
router.post("/batch-assign", authorizeRoles("Manager", "Data Analytics Manager"), batchAssignLeads);
router.route("/:id").get(getLeadById).put(canWork, updateLead).delete(authorizeRoles("Manager"), deleteLead);
router.route("/:id/notes").post(authorizeRoles("Manager", "Team Lead", "Sales Executive"), addLeadNote);

export default router;
