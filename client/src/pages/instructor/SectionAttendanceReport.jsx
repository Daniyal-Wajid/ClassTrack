import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import {
  Loader2,
  CalendarDays,
  Users,
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Save,
} from "lucide-react";

const API = process.env.REACT_APP_API_URL;

const FIXED_STUDENTS = [
  { id: "202102812", name: "Ali Alblooshi" },
  { id: "202021767", name: "Hamad Alketbi" },
  { id: "202022212", name: "Saif Alketbi" },
  { id: "201915236", name: "Saif Alkaabi" },
  { id: "202100588", name: "Ali Almerri" },
];

export default function SectionAttendanceReport() {
  const { token } = useAuth();
  const { sectionId } = useParams();
  const navigate = useNavigate();

  const [section, setSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedSession, setExpandedSession] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // 🟢 Load from localStorage initially
  const [attendanceEdits, setAttendanceEdits] = useState(() => {
    const saved = localStorage.getItem(`attendanceEdits_${sectionId}`);
    return saved ? JSON.parse(saved) : {};
  });

  // Fetch section + attendance data
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const { data } = await axios.get(
          `${API}/attendance/sections/${sectionId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSection(data.section || null);
      } catch (err) {
        console.error("Error fetching attendance:", err);
        setError(err.response?.data?.message || "Failed to load attendance.");
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchAttendance();
  }, [token, sectionId]);

  // 🟢 Save to localStorage whenever attendanceEdits changes
  useEffect(() => {
    localStorage.setItem(
      `attendanceEdits_${sectionId}`,
      JSON.stringify(attendanceEdits)
    );
  }, [attendanceEdits, sectionId]);

  const toggleExpand = (sessionId) => {
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString([], {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const getDuration = (start, end) => {
    if (!end) return "Ongoing";
    const diffMs = new Date(end) - new Date(start);
    const minutes = Math.floor(diffMs / 60000);
    return `${minutes} min`;
  };

  const sessions = section?.attendanceSessions || [];

  // 🟢 Group sessions by day (latest first)
  const sessionsByDay = useMemo(() => {
    if (!sessions.length) return {};
    const grouped = sessions.reduce((acc, session) => {
      const dateKey = new Date(session.startTime).toDateString();
      acc[dateKey] = acc[dateKey] || [];
      acc[dateKey].push(session);
      return acc;
    }, {});

    // Sort days so most recent first
    const sortedEntries = Object.entries(grouped).sort(
      ([a], [b]) => new Date(b) - new Date(a)
    );

    return Object.fromEntries(sortedEntries);
  }, [sessions]);

  // 🟢 Filter sessions by date/search/status
  const filteredSessionsByDay = useMemo(() => {
    const filtered = {};
    for (const [day, sessList] of Object.entries(sessionsByDay)) {
      const matchesDate =
        !selectedDate ||
        new Date(day).toDateString() === new Date(selectedDate).toDateString();
      if (!matchesDate) continue;

      const filteredList = sessList.filter((session) => {
        if (filterStatus !== "all" && session.status !== filterStatus) return false;
        if (searchQuery) {
          return FIXED_STUDENTS.some((stu) =>
            stu.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        return true;
      });

      if (filteredList.length > 0) filtered[day] = filteredList;
    }
    return filtered;
  }, [sessionsByDay, selectedDate, searchQuery, filterStatus]);

  // 🟢 Toggle attendance (multiple supported)
  const toggleAttendance = (sessionId, studentId) => {
    setAttendanceEdits((prev) => {
      const updated = { ...prev };
      updated[sessionId] = { ...updated[sessionId] };

      const currentStatus = updated[sessionId][studentId];
      updated[sessionId][studentId] =
        currentStatus === "present" ? "absent" : "present";

      // persist immediately
      localStorage.setItem(
        `attendanceEdits_${sectionId}`,
        JSON.stringify(updated)
      );
      return updated;
    });
  };

  const handleSave = (sessionId) => {
    console.log("Mock save:", attendanceEdits[sessionId]);
    alert("Attendance changes saved");
  };

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

  if (!section)
    return (
      <div className="p-6 text-gray-600">
        No attendance records found for this section.
      </div>
    );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <ArrowLeft
          className="cursor-pointer w-5 h-5 text-gray-600 hover:text-gray-800"
          onClick={() => navigate("/instructor/dashboard")}
        />
        <h2 className="text-2xl font-bold text-gray-900">
          Section Attendance Report
        </h2>
      </div>

      {/* Section Info */}
      <div className="bg-white border shadow-sm rounded-lg p-5 mb-6">
        <div className="flex items-center gap-2 text-gray-800 mb-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-lg">{section.name}</span>
        </div>
        {section.course && (
          <p className="text-gray-600 ml-6">
            Course:{" "}
            <span className="font-medium">{section.course.code}</span> —{" "}
            {section.course.name}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border shadow-sm rounded-lg p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-blue-600" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-600" />
          <input
            type="text"
            placeholder="Search student..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-48"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="all">All Sessions</option>
            <option value="ongoing">Ongoing</option>
            <option value="ended">Ended</option>
          </select>
        </div>

        <button
          onClick={() => {
            setSearchQuery("");
            setSelectedDate("");
            setFilterStatus("all");
          }}
          className="ml-auto text-sm text-blue-600 hover:underline"
        >
          Reset Filters
        </button>
      </div>

      {/* Sessions */}
      {Object.entries(filteredSessionsByDay).length > 0 ? (
        Object.entries(filteredSessionsByDay).map(([day, sessions]) => (
          <div key={day} className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-3">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              {formatDate(day)}
            </h3>

            <div className="space-y-3">
              {/* 🟢 Sort sessions newest first within day */}
              {sessions
                .sort(
                  (a, b) => new Date(b.startTime) - new Date(a.startTime)
                )
                .map((session) => (
                  <div
                    key={session._id}
                    className="bg-white shadow-sm border rounded-lg p-4"
                  >
                    {/* Session header */}
                    <div
                      className="flex justify-between items-center cursor-pointer"
                      onClick={() => toggleExpand(session._id)}
                    >
                      <div>
                        <div className="text-gray-800 font-medium">
                          {formatTime(session.startTime)} –{" "}
                          {session.endTime
                            ? formatTime(session.endTime)
                            : "Ongoing"}
                        </div>
                        <div className="text-sm text-gray-500">
                          Duration: {getDuration(session.startTime, session.endTime)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 text-sm rounded-full ${
                            session.status === "ended"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {session.status}
                        </span>
                        {expandedSession === session._id ? (
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                    </div>

                    {/* Expanded */}
                    {expandedSession === session._id && (
                      <div className="mt-3 border-t pt-3">
                        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" />
                          Manage Attendance
                        </h4>

                        <ul className="mt-2 space-y-2">
                          {FIXED_STUDENTS.map((stu) => {
                            // 🟢 correct multi-student logic
                            const editStatus = attendanceEdits[session._id]?.[stu.id];
                            const backendStatus = session.presentStudents?.some(
                              (p) => p.studentId === stu.id
                            )
                              ? "present"
                              : "absent";
                            const status = editStatus || backendStatus;

                            return (
                              <li
                                key={stu.id}
                                className="flex justify-between items-center border-b py-2"
                              >
                                <span className="text-gray-800 font-medium">
                                  {stu.name} ({stu.id})
                                </span>
                                <button
                                  onClick={() => toggleAttendance(session._id, stu.id)}
                                  className={`flex items-center gap-2 px-3 py-1 rounded text-sm text-white ${
                                    status === "present"
                                      ? "bg-green-600 hover:bg-green-700"
                                      : "bg-gray-400 hover:bg-gray-500"
                                  }`}
                                >
                                  {status === "present" ? (
                                    <CheckCircle className="w-4 h-4" />
                                  ) : (
                                    <XCircle className="w-4 h-4" />
                                  )}
                                  {status === "present" ? "Present" : "Absent"}
                                </button>
                              </li>
                            );
                          })}
                        </ul>

                        <button
                          onClick={() => handleSave(session._id)}
                          className="mt-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                        >
                          <Save className="w-4 h-4" />
                          Save Changes
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))
      ) : (
        <div className="p-6 text-gray-600 bg-gray-50 rounded text-center">
          No sessions found for the selected filters.
        </div>
      )}
    </div>
  );
}
