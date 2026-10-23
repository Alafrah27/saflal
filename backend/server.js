import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./lib/connectDb.js";
import job from "./lib/cron.js";
import cors from "cors";

dotenv.config();

import {
  app,
  server,
  io,
  onlineUsers,
  activeChatRooms,
} from "./lib/SocketIo.js";
import userRoutes from "./router/user.route.js";
import allusersRoutes from "./router/users.route.js";
import friendregustRoutes from "./router/friendregust.route.js";
import notificationRoutes from "./router/notification.route.js";
import chatRoutes from "./router/chat.route.js";
import messageRoutes from "./router/message.route.js";
const PORT = process.env.PORT || 3000;
job.start();
app.use(express.json({ limit: "5mb" })); // req.body
app.use(cookieParser());
app.use(cors("*"));

app.use((req, res, next) => {
  req.io = io;
  req.onlineUsers = onlineUsers;
  req.activeChatRooms = activeChatRooms;
  next();
});
app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/users", allusersRoutes);
app.use("/api/v1/friend", friendregustRoutes);
app.use("/api/v1/notification", notificationRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/message", messageRoutes);

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

connectDB()
  .then(() => {
    server.listen(PORT, () => {
     //  console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to the database:", error);
  });
