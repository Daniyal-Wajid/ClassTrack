import { Router } from "express";
import { auth, requireRole } from "../middleware/auth.js";
import {
  getCoursesWithSections,
  createCourse,
  createSection,
  assignInstructor,
  enrollStudents,
  getInstructors, // 👈 add this
} from "../controllers/adminController.js";

const router = Router();

// Admin only
router.post("/courses", auth, requireRole("admin"), createCourse);
router.post("/sections", auth, requireRole("admin"), createSection);
router.post(
  "/sections/:sectionId/instructor",
  auth,
  requireRole("admin"),
  assignInstructor
);
router.post(
  "/sections/:sectionId/enroll",
  auth,
  requireRole("admin"),
  enrollStudents
);

// Fetch
router.get("/courses", auth, requireRole("admin"), getCoursesWithSections);

// 👇 Add this
router.get("/instructors", auth, requireRole("admin"), getInstructors);

export default router;
