import express from "express";
import { getMessages, sendMessage, deleteMessages } from "../controller/message.controller.js";
import { verifyJWT } from "../middleWare/jwtAuth.js";

const router = express.Router();

router.delete("/delete-many", verifyJWT, deleteMessages);
router.post("/:chatId", verifyJWT, sendMessage);
router.get("/:chatId", verifyJWT, getMessages);

export default router;
