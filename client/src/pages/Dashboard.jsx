import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  Users,
  GraduationCap,
  BarChart3,
  LogOut,
  LayoutDashboard,
  Layers,
  Monitor,
} from "lucide-react";

export default function Dashboard() {
  const { user, logout } = useAuth();

  // Role-based nav items (no student section anymore)
  const navItems = {
    instructor: [
      { to: "/instructor/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/instructor/sections", label: "Sections", icon: Layers },
      { to: "/instructor/attendance", label: "Attendance", icon: ClipboardList },
      { to: "/instructor/monitoring", label: "Monitoring", icon: Monitor },
    ],
    admin: [
      { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/attendance", label: "Attendance Reports", icon: ClipboardList },
      { to: "/admin/users", label: "Manage Users", icon: Users },
      { to: "/admin/courses", label: "All Courses", icon: GraduationCap },
    ],
  };

  const items = navItems[user?.role] || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-700 tracking-tight">
            ClassTrack
          </h1>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-sm transition"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* User info */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome, {user?.name}
          </h2>
          <p className="text-gray-600 mt-1">
            Logged in as{" "}
            <span className="capitalize font-semibold text-blue-700">
              {user?.role}
            </span>
          </p>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {items.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group bg-white border border-gray-200 rounded-xl p-6 shadow hover:shadow-lg hover:border-blue-500 transition flex flex-col items-start"
            >
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-50 text-blue-600 mb-4 group-hover:bg-blue-100">
                <Icon size={24} />
              </div>
              <span className="text-lg font-semibold text-gray-800">
                {label}
              </span>
              <span className="text-sm text-gray-500 mt-1">
                {label === "Sections"
                  ? "View and manage your sections"
                  : label.includes("Attendance")
                  ? "Track and review attendance"
                  : label.includes("Monitoring")
                  ? "Enable camera monitoring"
                  : label.includes("Users")
                  ? "Manage system users"
                  : label.includes("Courses")
                  ? "Browse all courses"
                  : "Overview and insights"}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
