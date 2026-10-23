import admin from "../lib/firebase-admin.js";

export const verifyFirebaseToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });

    const decoded = await admin.auth().verifyIdToken(token);
    if (!decoded.uid) {
      return res.status(401).json({ message: "Invalid Firebase token" });
    }
    req.firebaseUser = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid Firebase token" });
  }
};
