// routes/behavior.js
import { Router } from "express";
import { auth, requireRole } from "../middleware/auth.js";
import {
  getStudentBehavior,
  getSessionBehavior,
} from "../controllers/behaviorController.js";

const router = Router();

// Instructor/Admin: view student logs
router.get(
  "/student/:studentId",
  auth,
  requireRole("instructor", "admin"),
  getStudentBehavior
);

// Instructor/Admin: view session logs
router.get(
  "/session/:sessionId",
  auth,
  requireRole("instructor", "admin"),
  getSessionBehavior
);

export default router;
