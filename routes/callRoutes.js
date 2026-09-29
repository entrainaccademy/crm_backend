import express from "express";
import { authorizeRoles } from "../middleware/authMiddleware.js";
import { getCalls, logCall, deleteCall } from "../controllers/callController.js";

const router = express.Router();
router.use(authorizeRoles("Super Admin", "Manager", "Data Analytics Manager", "Team Leader", "Sales Executive"));

router.route("/").get(getCalls).post(authorizeRoles("Super Admin", "Manager", "Team Leader", "Sales Executive"), logCall);
router.route("/:id").delete(authorizeRoles("Super Admin", "Manager", "Team Leader"), deleteCall);

export default router;
