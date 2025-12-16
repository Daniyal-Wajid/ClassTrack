import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";

const toToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // 🚫 Prevent creating admin accounts via API
    if (role === "admin") {
      return res.status(403).json({ message: "Cannot create admin account" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: role || "student",
      isVerified: true,
    });

    const token = toToken(user);
    return res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (e) {
    return res.status(500).json({ message: "Server error", error: e.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Hardcoded Admin Login
    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = jwt.sign(
        { id: "superadmin", role: "admin", name: "Super Admin", email },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.json({
        user: { id: "superadmin", name: "Super Admin", email, role: "admin" },
        token,
      });
    }

    // ✅ Hardcoded Instructor Login
    if (
      email === process.env.INSTRUCTOR_EMAIL &&
      password === process.env.INSTRUCTOR_PASSWORD
    ) {
      const token = jwt.sign(
        {
          id: "hardinstructor",
          role: "instructor",
          name: "Hardcoded Instructor",
          email,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.json({
        user: {
          id: "hardinstructor",
          name: "Hardcoded Instructor",
          email,
          role: "instructor",
        },
        token,
      });
    }

    // ✅ Normal DB Login (students + instructors)
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = toToken(user);
    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
};
