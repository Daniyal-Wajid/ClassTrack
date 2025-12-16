import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2, PlayCircle } from "lucide-react";

const API = process.env.REACT_APP_API_URL;

export default function OngoingSessions() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSessions = async () => {
      setIsFetching(true);
      setError("");
      try {
        const { data } = await axios.get(`${API}/instructor/ongoing-sessions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSessions(data.sessions || []);
      } catch (err) {
        console.error("Error fetching sessions:", err);
        setError("Unable to load ongoing sessions. Please try again later.");
      } finally {
        setIsFetching(false);
      }
    };

    fetchSessions();
  }, [token]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <PlayCircle className="text-blue-600 w-6 h-6" />
        <h2 className="text-2xl font-bold text-gray-900">
          Ongoing Sessions
        </h2>
      </div>

      {isFetching && (
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="animate-spin w-5 h-5 text-blue-600" />
          Loading sessions…
        </div>
      )}

      {!isFetching && error && (
        <div className="p-4 mb-4 bg-red-50 text-red-700 border border-red-200 rounded">
          {error}
        </div>
      )}

      {!isFetching && !error && sessions.length === 0 && (
        <p className="text-gray-600">No ongoing sessions at the moment.</p>
      )}

      {!isFetching && !error && sessions.length > 0 && (
        <div className="space-y-8">
          {sessions.map((session) => (
            <div
              key={session._id}
              className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition p-5"
            >
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  {session.course.code} – {session.course.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Section: {session.section.name}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {session.status === "active" ? "Active" : "Inactive"}
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => navigate(`/instructor/monitoring/${session._id}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Monitor Session
                </button>
                {session.status === "inactive" && (
                  <button
                    onClick={() => navigate(`/instructor/monitoring/${session._id}`)}
                    className="px-4 py-2 bg-gray-400 text-white rounded cursor-not-allowed"
                    disabled
                  >
                    Session Ended
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
