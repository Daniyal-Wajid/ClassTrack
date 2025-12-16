import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { RFID_MAP } from "../../config/rfidMap"; // ✅ Import static students

const API = process.env.REACT_APP_API_URL;

export default function EnrollStudentsPage() {
  const { token } = useAuth();
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // ---------------- Load courses + static students ----------------
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // 1️⃣ Fetch courses from backend
        const courseRes = await axios.get(`${API}/admin/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCourses(courseRes.data.courses || []);

        // 2️⃣ Load students from local RFID map
        const staticStudents = Object.values(RFID_MAP).map((s) => ({
          _id: s.student, // MongoDB id
          name: s.name,
          studentId: s.studentId,
        }));
        setStudents(staticStudents);
      } catch (err) {
        console.error(err);
        setMessage("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [token]);

  // ---------------- Enroll Students ----------------
  const handleEnroll = async () => {
    if (!selectedSection || selectedStudents.length === 0) {
      return alert("Select a section and at least one student");
    }

    try {
      await axios.post(
        `${API}/admin/sections/${selectedSection}/students`,
        { studentIds: selectedStudents },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("✅ Students successfully enrolled!");
      setSelectedStudents([]);
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to enroll students");
    }
  };

  const toggleStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // ---------------- UI ----------------
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Enroll Students to Sections</h2>

      {loading ? (
        <p className="text-gray-500">Loading data...</p>
      ) : (
        <>
          {message && <p className="mb-4 text-sm text-blue-600">{message}</p>}

          {/* Select Course */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Select Course</label>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setSelectedSection("");
              }}
              className="border p-2 rounded w-full"
            >
              <option value="">-- Choose a course --</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Select Section */}
          {selectedCourse && (
            <div className="mb-4">
              <label className="block font-medium mb-1">Select Section</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="border p-2 rounded w-full"
              >
                <option value="">-- Choose a section --</option>
                {courses
                  .find((c) => c._id === selectedCourse)
                  ?.sections.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} — {s.instructor?.name || "No Instructor"}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Select Students */}
          {selectedSection && (
            <div className="mb-6">
              <label className="block font-medium mb-2">
                Select Students to Enroll
              </label>
              <div className="max-h-64 overflow-y-auto border rounded p-2 space-y-1">
                {students.map((s) => (
                  <label
                    key={s._id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(s._id)}
                      onChange={() => toggleStudent(s._id)}
                    />
                    {s.name} ({s.studentId})
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleEnroll}
            disabled={!selectedSection || selectedStudents.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Enroll Selected Students
          </button>
        </>
      )}
    </div>
  );
}
