// routes/camera.js
import { Router } from "express";
import { auth, requireRole } from "../middleware/auth.js";
import {
  logCameraEvent,
  getSessionCameraLogs,
} from "../controllers/cameraController.js";

const router = Router();

// Save camera AI logs
router.post("/log", auth, requireRole("instructor", "admin"), logCameraEvent);

// Fetch logs by sessionId (not section anymore)
router.get(
  "/logs/:sessionId",
  auth,
  requireRole("instructor", "admin"),
  getSessionCameraLogs
);

export default router;
