import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Layers, Clock, LogOut } from "lucide-react";

export default function InstructorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    {
      to: "/instructor/sections",
      label: "Sections",
      icon: Layers,
      description: "View your assigned courses and sections",
    },
    {
      to: "/instructor/ongoing-sessions",
      label: "Ongoing Sessions",
      icon: Clock,
      description: "Manage and monitor current ongoing sessions",
    },
  ];

  const displayName = user?.name || "Instructor";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-12 flex items-center justify-between">
          {/* Left: Instructor Info */}
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
              {displayName[0]?.toUpperCase() || "I"}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Instructor Dashboard
              </h1>
              <p className="text-gray-600">
                Welcome back,{" "}
                <span className="font-medium text-blue-700">{displayName}</span>
              </p>
            </div>
          </div>

          {/* ✅ Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium px-4 py-2 rounded-lg border border-red-200 transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </header>

        {/* Navigation Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {navItems.map(({ to, label, icon: Icon, description }) => (
            <Link
              key={to}
              to={to}
              className="group bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            >
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-50 text-blue-600 mb-4 group-hover:bg-blue-100 group-hover:scale-105 transition-transform">
                <Icon size={24} />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">{label}</h2>
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
