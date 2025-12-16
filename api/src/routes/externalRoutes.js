// routes/external.js
import { Router } from "express";
import { requireApiKey } from "../middleware/apiKey.js";
import {
  getActiveSession,
  externalMarkAttendance,
} from "../controllers/externalController.js";
import { logBehavior } from "../controllers/behaviorController.js";
import { logCameraEvent } from "../controllers/cameraController.js";

const router = Router();

// RFID
router.get("/session/active", requireApiKey, getActiveSession);
router.post("/attendance/mark", requireApiKey, externalMarkAttendance);

// AI Behavior
router.post("/behavior/log", requireApiKey, logBehavior);

// Camera
router.post("/camera/log", requireApiKey, logCameraEvent);

export default router;
