import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { Loader2, Calendar, Clock } from "lucide-react";

const API = process.env.REACT_APP_API_URL;

export default function InstructorAttendanceReport() {
  const { token } = useAuth();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const { data } = await axios.get(`${API}/instructor/sections/attendance`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSections(data.sections || []);
      } catch (err) {
        console.error("Error fetching attendance:", err);
        setError(err.response?.data?.message || "Failed to load attendance.");
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [token]);

  if (loading)
    return (
      <div className="flex items-center gap-3 text-gray-500 p-6">
        <Loader2 className="animate-spin w-5 h-5 text-blue-600" />
        Loading attendance data…
      </div>
    );

  if (error)
    return (
      <div className="p-6 text-red-600 bg-red-50 border border-red-200 rounded">
        {error}
      </div>
    );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">My Attendance Records</h2>

      {sections.length === 0 ? (
        <p>No sections or attendance records found.</p>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <div
              key={section._id}
              className="bg-white shadow rounded-lg p-5 border border-gray-200"
            >
              <h3 className="text-xl font-semibold mb-2">
                {section.course?.code} - {section.course?.name}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Section: {section.name}
              </p>

              {section.attendanceSessions?.length > 0 ? (
                <ul className="divide-y">
                  {section.attendanceSessions.map((sess) => (
                    <li key={sess._id} className="py-3 flex justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="w-4 h-4" />
                          {new Date(sess.startTime).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 ml-6">
                          <Clock className="w-4 h-4" />
                          {new Date(sess.startTime).toLocaleTimeString()}
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 text-sm rounded-full ${
                          sess.status === "ended"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {sess.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">No sessions yet.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
