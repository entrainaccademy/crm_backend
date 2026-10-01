import express from "express";
import { authorizeRoles } from "../middleware/authMiddleware.js";
import { getCalls, logCall, deleteCall } from "../controllers/callController.js";

const router = express.Router();
router.use(authorizeRoles("Super Admin", "Manager", "Data Analytics Manager", "Team Lead", "Sales Executive"));

router.route("/").get(getCalls).post(authorizeRoles("Manager", "Data Analytics Manager", "Team Lead", "Sales Executive"), logCall);
router.route("/:id").delete(authorizeRoles("Manager", "Data Analytics Manager"), deleteCall);

export default router;
