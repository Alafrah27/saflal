import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { User } from "../model/user.js";

dotenv.config();

export const verifyJWT = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No JWT" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    // console.log("Authenticated user:", user);

    req.user = user;
    next();
  } catch (error) {
    // console.log(error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
