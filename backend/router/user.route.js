import express from "express";
import {
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
  Register, 
  Login,
  savePushToken,
  getMyBlockContacts,

} from "../controller/user.controller.js";

import { verifyJWT } from "../middleWare/jwtAuth.js";
const router = express.Router();

router.post("/register", Register);
router.post("/login", Login);
router.get("/user-profile", verifyJWT, getUserProfile);
router.get("/blocked-contacts", verifyJWT, getMyBlockContacts);
router.put("/update-profile", verifyJWT, updateUserProfile);
router.put("/save-push-token", verifyJWT, savePushToken);
router.delete("/delete-account", verifyJWT, deleteUserAccount);

export default router;
