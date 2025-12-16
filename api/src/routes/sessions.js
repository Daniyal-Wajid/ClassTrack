import { Router } from "express";
import { auth, requireRole } from "../middleware/auth.js";
import {
  getSessionById,
  captureFrame,
  getCameraLogs,
} from "../controllers/attendanceController.js";

const router = Router();

// Get session details
router.get("/:id", auth, requireRole("instructor", "admin"), getSessionById);

// Capture a frame from camera
router.post(
  "/:id/capture",
  auth,
  requireRole("instructor", "admin"),
  captureFrame
);

// Get logs for a session
router.get(
  "/:id/logs",
  auth,
  requireRole("instructor", "admin"),
  getCameraLogs
);

export default router;
