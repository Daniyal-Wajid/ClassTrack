import { Router } from "express";
import { auth, requireRole } from "../middleware/auth.js";
import {
  getInstructorSectionsWithAttendance,
  getInstructorSections,
  getSectionStudents,
  getSectionById,
  getOngoingSessions,
  getSectionAttendance,
} from "../controllers/instructorController.js";

const router = Router();

/**
 * 🔹 Instructor Routes
 * Allow instructors (and optionally admins)
 * to view their sections, students, sessions, and attendance.
 */

// ✅ Fetch all sections assigned to the instructor
router.get(
  "/sections",
  auth,
  requireRole("instructor", "admin"),
  getInstructorSections
);

// ✅ Fetch sections + attendance sessions for the logged-in instructor
router.get(
  "/sections/attendance",
  auth,
  requireRole("instructor", "admin"),
  getInstructorSectionsWithAttendance
);

// ✅ Fetch detailed info for a specific section
router.get(
  "/sections/:id",
  auth,
  requireRole("instructor", "admin"),
  getSectionById
);

// ✅ Fetch all students in a specific section
router.get(
  "/sections/:id/students",
  auth,
  requireRole("instructor", "admin"),
  getSectionStudents
);

// ✅ Fetch attendance records for a specific section
router.get(
  "/sections/:id/attendance",
  auth,
  requireRole("instructor", "admin"),
  getSectionAttendance
);

// ✅ Get ongoing sessions for the instructor
router.get(
  "/ongoing-sessions",
  auth,
  requireRole("instructor", "admin"),
  getOngoingSessions
);

router.get("/sections/:sectionId", getSectionAttendance);
export default router;
