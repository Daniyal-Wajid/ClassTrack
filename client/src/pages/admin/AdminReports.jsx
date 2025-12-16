import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import { Loader2, Users } from "lucide-react";

const API = process.env.REACT_APP_API_URL;

export default function AdminReports() {
  const { token } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setError("");
        const res = await axios.get(`${API}/admin/reports/attendance`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Sort newest first
        const sorted = (res.data.attendance || []).sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        setAttendance(sorted);
      } catch (err) {
        console.error("Error fetching attendance reports:", err);
        setError("Failed to load attendance data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Users className="text-blue-600 w-6 h-6" />
        <h2 className="text-2xl font-bold text-gray-900">
          Attendance Reports
        </h2>
      </div>

      {/* Loading / Error / Empty */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="animate-spin w-5 h-5 text-blue-600" />
          Loading attendance data...
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      ) : attendance.length === 0 ? (
        <p className="text-gray-500">No attendance records found.</p>
      ) : (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Attendance Logs</h3>

          <ul className="divide-y max-h-[650px] overflow-y-auto text-sm">
            {attendance.map((a) => (
              <li
                key={a._id}
                className="py-3 border-gray-100 hover:bg-gray-50 transition-colors"
              >
                {/* Student Name */}
                <div className="font-medium text-gray-800">
                  {a.student?.name || "Unknown Student"}
                </div>

                {/* Course Info */}
                <div className="text-gray-600">
                  {a.course?.code || "—"} — {a.course?.name || "Unnamed Course"}
                </div>

                {/* Section & Instructor */}
                <div className="text-gray-500 text-xs">
                  Section: {a.section?.name || "—"} | Instructor:{" "}
                  {a.instructor?.name || "—"}
                </div>

                {/* Session Time */}
                <div className="text-gray-500 text-xs">
                  Session:{" "}
                  {a.session?.startTime
                    ? new Date(a.session.startTime).toLocaleString()
                    : "—"}
                </div>

                {/* Status Badge */}
                <div className="mt-1">
                  <span
                    className={`px-2 py-1 text-xs rounded capitalize ${
                      a.status === "present"
                        ? "bg-green-100 text-green-700"
                        : a.status === "absent"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {a.status || "unknown"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
