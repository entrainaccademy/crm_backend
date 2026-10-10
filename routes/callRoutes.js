import express from "express";
import { authorizeRoles } from "../middleware/authMiddleware.js";
import {
  getCalls,
  getCallById,
  logCall,
  updateCall,
  deleteCall,
  streamCallRecording,
} from "../controllers/callController.js";

const router = express.Router();

// Audio stream endpoint handles its own authentication via header OR ?token= query parameter
router.get("/:id/audio", streamCallRecording);

router.use(authorizeRoles("Super Admin", "Manager", "Data Analytics Manager", "Team Lead", "Sales Executive"));

router.route("/")
  .get(getCalls)
  .post(authorizeRoles("Manager", "Data Analytics Manager", "Team Lead", "Sales Executive"), logCall);

router.route("/:id")
  .get(getCallById)
  .put(updateCall)
  .delete(authorizeRoles("Manager", "Data Analytics Manager", "Super Admin"), deleteCall);

export default router;
