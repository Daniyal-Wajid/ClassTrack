import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Book, Users, LogOut, UserPlus } from "lucide-react";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

const API = process.env.REACT_APP_API_URL;

export default function AdminDashboard() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, usersRes] = await Promise.all([
          axios.get(`${API}/admin/courses`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API}/admin/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setCourses(coursesRes.data.courses || []);
        setUsers(usersRes.data.users || []);
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const totalSections = courses.reduce(
    (sum, c) => sum + (c.sections?.length || 0),
    0
  );
  const instructors = users.filter((u) => u.role === "instructor");
  const students = users.filter((u) => u.role === "student");

  const pieData = [
    { name: "Courses", value: courses.length },
    { name: "Sections", value: totalSections },
    { name: "Instructors", value: instructors.length },
    { name: "Students", value: students.length },
  ];
  const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444"];

  const navItems = [
    {
      to: "/admin/courses",
      label: "Manage Courses",
      icon: Book,
      description: `Total: ${courses.length}`,
    },
    {
      to: "/admin/users",
      label: "Manage Users",
      icon: Users,
      description: `${instructors.length} Instructors, ${students.length} Students`,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Welcome back,{" "}
              <span className="font-medium text-blue-700">{user?.name}</span>
            </p>
          </div>

          <div className="flex gap-3">
            {/* ✅ Enroll Students Button */}
            <button
              onClick={() => navigate("/admin/enroll-students")}
              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium px-4 py-2 rounded-lg border border-blue-200 transition"
            >
              <UserPlus size={18} />
              Enroll Students
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium px-4 py-2 rounded-lg border border-red-200 transition"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {/* KPI / Navigation Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
              {navItems.map(({ to, label, icon: Icon, description }) => (
                <Link
                  key={to}
                  to={to}
                  className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-md border border-gray-200 hover:border-blue-500 transition"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100">
                      <Icon size={24} />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-800">
                        {label}
                      </p>
                      <p className="text-sm text-gray-500">{description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Chart + Courses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pie Chart Overview */}
              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                  System Overview
                </h3>
                {pieData.every((d) => d.value === 0) ? (
                  <p className="text-gray-500 text-sm">No data available yet.</p>
                ) : (
                  <div className="h-72">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Courses & Sections */}
              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                  Courses & Sections
                </h3>
                {courses.length === 0 ? (
                  <p className="text-gray-500 text-sm">No courses found.</p>
                ) : (
                  <ul className="space-y-4">
                    {courses.map((c) => (
                      <li key={c._id} className="border-b last:border-0 pb-3">
                        <div className="font-semibold text-gray-800">
                          {c.name}{" "}
                          <span className="text-gray-500">({c.code})</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {c.sections?.length || 0} section
                          {c.sections?.length === 1 ? "" : "s"}
                        </div>

                        {c.sections?.length > 0 && (
                          <ul className="ml-5 mt-2 text-sm text-gray-700 list-disc space-y-1">
                            {c.sections.map((s) => (
                              <li key={s._id}>
                                {s.name} — Instructor:{" "}
                                {s.instructor?.name || "—"}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
