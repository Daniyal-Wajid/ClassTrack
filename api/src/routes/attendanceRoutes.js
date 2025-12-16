import { Router } from "express";
import { auth, requireRole } from "../middleware/auth.js";
import {
  startSession,
  endSession,
  getCurrentSession,
  markAttendance,
  getSectionAttendance,
  getSessionById,
  captureFrame,
  getCameraLogs,
  getSessionDetails,
  getSessionAttendance,
  updateAttendanceManually,
  recordRfidScan,
  getSectionStudents,
} from "../controllers/attendanceController.js";

const router = Router();

// -------------------- Session Control --------------------
router.post("/start", auth, requireRole("instructor", "admin"), startSession);
router.post("/end", auth, requireRole("instructor", "admin"), endSession);
router.get(
  "/current",
  auth,
  requireRole("instructor", "admin"),
  getCurrentSession
);

// -------------------- Attendance --------------------
router.post(
  "/attendance",
  auth,
  requireRole("instructor", "admin"),
  markAttendance
);
router.get(
  "/attendance/:sectionId",
  auth,
  requireRole("instructor", "admin"),
  getSectionAttendance
);
router.get(
  "/attendance/session/:sessionId",
  auth,
  requireRole("instructor", "admin"),
  getSessionAttendance
);
router.put(
  "/attendance/session/:sessionId/manual",
  auth,
  requireRole("instructor", "admin"),
  updateAttendanceManually
);

// -------------------- Session Info --------------------
router.get("/:id", auth, requireRole("instructor", "admin"), getSessionById);

// -------------------- Camera Monitoring --------------------
router.post(
  "/camera/:id",
  auth,
  requireRole("instructor", "admin"),
  captureFrame
);
router.get(
  "/camera/logs/:id",
  auth,
  requireRole("instructor", "admin"),
  getCameraLogs
);
router.get(
  "/details/:sessionId",
  auth,
  requireRole("instructor", "admin"),
  getSessionDetails
);

// -------------------- RFID --------------------
router.post(
  "/rfid/:sessionId",
  auth,
  requireRole("instructor", "admin"),
  recordRfidScan
);
router.get(
  "/section/:sectionId/students",
  auth,
  requireRole("instructor", "admin"),
  getSectionStudents
);
router.get("/sections/:sectionId", getSectionAttendance);

export default router;
