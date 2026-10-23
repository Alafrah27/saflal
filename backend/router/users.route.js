import express from "express";
import {
  toggleBlockUser,
  GetAllusers,
  getUserProfileById,
} from "../controller/users.controller.js";
import { verifyJWT } from "../middleWare/jwtAuth.js";
const router = express.Router();

router.get("/all-users", verifyJWT, GetAllusers);
router.post("/users/:id", verifyJWT, toggleBlockUser);
router.get("/user-profile/:id", verifyJWT, getUserProfileById);

export default router;
