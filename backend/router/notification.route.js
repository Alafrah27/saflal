import express from "express";
import { SendNotification } from "../controller/notifications.controller.js";

const router = express.Router();

router.post("/send/:id", SendNotification);

export default router;
