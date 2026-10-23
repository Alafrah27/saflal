import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { User } from "../model/user.js";

dotenv.config();

export const socketMiddleware = async (socket, next) => {
  try {
    // 1. Extract token from handshake headers
    // Mobile (Expo) sends headers through 'extraHeaders' or 'auth'
    const authHeader = socket.handshake.headers.authorization;
    const token = authHeader?.split(" ")[1] || socket.handshake.auth?.token;

    if (!token) {
      // console.log("❌ Socket Auth: No token provided");
      return next(new Error("Unauthorized - No Token Provided"));
    }

    // 2. Verify the JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      // console.log("❌ Socket Auth: Invalid token");
      return next(new Error("Unauthorized - Invalid Token"));
    }

    // 3. Find the user in the database
    // Using .lean() or .select("-password") for performance
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      // console.log("❌ Socket Auth: User not found in DB");
      return next(new Error("User not found"));
    }

    // 4. Attach user data to the socket object
    // This makes 'socket.user' available in your io.on("connection") block
    socket.user = user;
    socket.userId = user._id.toString();

    // console.log(`✅ Socket Authenticated: ${user.FullName} `);

    next(); // Proceed to connection
  } catch (error) {
    console.error("⚠️ Socket Auth Error:", error.message);

    // If token is expired, send a specific message so the app can logout the user
    if (error.name === "TokenExpiredError") {
      return next(new Error("Token Expired"));
    }

    next(new Error("Authentication failed"));
  }
};
