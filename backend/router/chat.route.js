import express from "express";
import { getMyChats, deleteChats } from "../controller/chat.controllser.js";
import { verifyJWT } from "../middleWare/jwtAuth.js";

const router = express.Router();

router.get("/", verifyJWT, getMyChats);
router.delete("/delete-many", verifyJWT, deleteChats);
// router.post("/:userId", verifyJWT, getorcreatedChat);

export default router;
