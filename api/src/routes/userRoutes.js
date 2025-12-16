import { Router } from "express";
import { auth, requireRole } from "../middleware/auth.js";
import User from "../models/User.js";

const router = Router();

// ✅ Current user
router.get("/me", auth, async (req, res) => {
  // 🚀 Handle hardcoded users (skip DB query)
  if (req.user.isSuperAdmin || req.user.isHardInstructor) {
    return res.json({ user: req.user });
  }

  const user = await User.findById(req.user.id).select("-passwordHash");
  res.json({ user });
});

// ✅ Admin-only: list users
router.get("/", auth, requireRole("admin"), async (req, res) => {
  const users = await User.find().select("-passwordHash");

  // Hardcoded instructor
  const hardcodedInstructor = {
    id: "hardinstructor",
    name: "Hardcoded Instructor",
    email: process.env.INSTRUCTOR_EMAIL,
    role: "instructor",
    isVerified: true,
  };

  // Hardcoded admin
  const hardcodedAdmin = {
    id: "hardadmin",
    name: "Hardcoded Admin",
    email: process.env.ADMIN_EMAIL,
    role: "admin",
    isVerified: true,
  };

  // ✅ Return DB users + hardcoded accounts
  res.json({ users: [...users, hardcodedInstructor, hardcodedAdmin] });
});

export default router;
