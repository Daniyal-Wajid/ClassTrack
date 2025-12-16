// src/routes/rfidRoutes.js
import express from "express";
import { recordRfidScan } from "../controllers/attendanceController.js";
import { auth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Protect RFID route
router.post(
  "/rfid/:sessionId",
  auth,
  requireRole("instructor"),
  recordRfidScan
);

export default router;
