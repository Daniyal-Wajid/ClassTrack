import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";

import Dashboard from "./pages/Dashboard";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminUsers from "./pages/admin/AdminUsers"; // ✅ NEW
import AdminReports from "./pages/admin/AdminReports"; // ✅ NEW
import EnrollStudentsPage from "./pages/admin/EnrollStudentsPage"; // ✅ NEW

import InstructorDashboard from "./pages/instructor/InstructorDashboard";
import InstructorSections from "./pages/instructor/InstructorSections";
import InstructorAttendance from "./pages/instructor/InstructorAttendance";
import InstructorMonitoring from "./pages/instructor/InstructorMonitoring";
import CourseSections from "./pages/instructor/CourseSections";
import SectionAttendanceReport from "./pages/instructor/SectionAttendanceReport";

import ProtectedRoute from "./components/ProtectedRoute";
import OngoingSessions from "./pages/instructor/OngoingSessions";

export default function App() {
  return (
    <Routes>
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" />} />

      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Optional global landing (role-based) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* ================= INSTRUCTOR ROUTES ================= */}
      <Route
        path="/instructor/dashboard"
        element={
          <ProtectedRoute roles={["instructor", "admin"]}>
            <InstructorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/sections"
        element={
          <ProtectedRoute roles={["instructor", "admin"]}>
            <InstructorSections />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/attendance"
        element={
          <ProtectedRoute roles={["instructor", "admin"]}>
            <InstructorAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/ongoing-sessions"
        element={
          <ProtectedRoute roles={["instructor", "admin"]}>
            <OngoingSessions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/monitoring/:sessionId"
        element={
          <ProtectedRoute roles={["instructor", "admin"]}>
            <InstructorMonitoring />
          </ProtectedRoute>
        }
      />
      <Route
        path="/instructor/course/:courseId/sections"
        element={<CourseSections />}
      />
      <Route
        path="/instructor/sections/:sectionId/attendance"
        element={<SectionAttendanceReport />}
      />

      {/* ================= ADMIN ROUTES ================= */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/courses"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminCourses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminReports />
          </ProtectedRoute>
        }
      />
      <Route path="/admin/enroll-students" element={<EnrollStudentsPage />} />
    </Routes>
  );
}
