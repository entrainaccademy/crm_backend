import express from "express";
import { getCalls, logCall, deleteCall } from "../controllers/callController.js";

const router = express.Router();

router.route("/").get(getCalls).post(logCall);
router.route("/:id").delete(deleteCall);

export default router;
