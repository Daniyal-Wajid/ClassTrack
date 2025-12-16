import { Router } from "express";
import { auth, requireRole } from "../middleware/auth.js";
import {
  createCourse,
  createCourseWithSection,
  updateCourse,
  deleteCourse,
  createSection,
  assignInstructor,
  enrollStudents,
  updateSection,
  deleteSection,
  getCoursesWithSections,
  getUsers,
  getInstructors,
  getAttendanceReports,
  createUser,
  updateUser,
  deleteUser,
  getStudents, // ✅ import attendance report controller
} from "../controllers/adminController.js";

const router = Router();

// ---------------- Course Management ----------------
router.post("/courses", auth, requireRole("admin"), createCourse);
router.post(
  "/courses/full",
  auth,
  requireRole("admin"),
  createCourseWithSection
);
router.put("/courses/:id", auth, requireRole("admin"), updateCourse);
router.delete("/courses/:id", auth, requireRole("admin"), deleteCourse);

// ---------------- Section Management ----------------
router.post("/sections", auth, requireRole("admin"), createSection);
router.put("/sections/:sectionId", auth, requireRole("admin"), updateSection);
router.delete(
  "/sections/:sectionId",
  auth,
  requireRole("admin"),
  deleteSection
);

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

router.post(
  "/sections/:sectionId/students",
  auth,
  requireRole("admin"),
  enrollStudents
);

// ---------------- Data Fetch ----------------
router.get("/courses", auth, requireRole("admin"), getCoursesWithSections);
router.get("/users", auth, requireRole("admin"), getUsers);
router.get("/instructors", auth, requireRole("admin"), getInstructors);

// ---------------- Attendance Reports ----------------
router.get("/attendance", auth, requireRole("admin"), getAttendanceReports);

// ---------------- Reports ----------------
router.get(
  "/reports/attendance",
  auth,
  requireRole("admin"),
  getAttendanceReports
);

// ---------------- User Management ----------------
router.post("/users", auth, requireRole("admin"), createUser);
router.put("/users/:id", auth, requireRole("admin"), updateUser);
router.delete("/users/:id", auth, requireRole("admin"), deleteUser);

router.get("/students", auth, requireRole("admin"), getStudents);

export default router;
