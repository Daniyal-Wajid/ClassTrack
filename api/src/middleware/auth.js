import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🚀 Super Admin (matches login payload)
    if (decoded.id === "superadmin") {
      req.user = {
        id: "superadmin",
        name: "Super Admin",
        email: decoded.email,
        role: "admin",
        isSuperAdmin: true,
      };
      return next();
    }

    // 🚀 Hardcoded Instructor (matches login payload)
    if (decoded.id === "hardinstructor") {
      req.user = {
        id: "hardinstructor",
        name: "Hardcoded Instructor",
        email: decoded.email,
        role: "instructor",
        isHardInstructor: true,
      };
      return next();
    }

    // ✅ Normal DB user
    const user = await User.findById(decoded.id).select("-passwordHash");
    if (!user) return res.status(401).json({ message: "Invalid token user" });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized", error: err.message });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ message: "No user in request" });
    }

    // 🚀 Super Admin bypass (full access)
    if (req.user.isSuperAdmin) return next();

    // 🚀 Hardcoded instructor bypass
    if (req.user.isHardInstructor && roles.includes("instructor")) {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Forbidden: insufficient permissions" });
    }

    next();
  };
};
