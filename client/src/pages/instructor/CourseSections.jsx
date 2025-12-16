import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const API = process.env.REACT_APP_API_URL || "";

export default function CourseSections() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { token } = useAuth();

  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState("");

  if (!state) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-gray-600">No data available. Go back.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
        >
          Go Back
        </button>
      </div>
    );
  }

  const { course, sections } = state;

  const handleStartSession = async (section) => {
    try {
      setLoadingId(section._id);
      setError("");
      const { data } = await axios.post(
        `${API}/attendance/start`,
        { courseId: course._id, sectionId: section._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/instructor/monitoring/${data.session._id}`);
    } catch (err) {
      console.error("Error starting session:", err);
      setError(err.response?.data?.message || "Failed to start session.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleViewAttendance = (section) => {
    navigate(`/instructor/sections/${section._id}/attendance`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <ArrowLeft
          className="cursor-pointer w-5 h-5 text-gray-600"
          onClick={() => navigate(-1)}
        />
        <h2 className="text-2xl font-bold text-gray-900">
          Sections for {course.name} ({course.code})
        </h2>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-red-50 text-red-700 border border-red-200 rounded">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <div
            key={s._id}
            className="border rounded-lg p-4 flex flex-col hover:shadow transition"
          >
            <p className="font-medium text-gray-800 mb-4">Section: {s.name}</p>

            <button
              onClick={() => handleStartSession(s)}
              disabled={loadingId === s._id}
              className={`mb-2 px-3 py-1 text-sm font-medium rounded transition ${
                loadingId === s._id
                  ? "bg-blue-300 text-white cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {loadingId === s._id ? "Starting…" : "Start Session"}
            </button>

            <button
              onClick={() => handleViewAttendance(s)}
              className="px-3 py-1 text-sm font-medium rounded bg-gray-600 text-white hover:bg-gray-700 transition"
            >
              Attendance
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
