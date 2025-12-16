import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2, BookOpen } from "lucide-react";

const API = process.env.REACT_APP_API_URL;

export default function InstructorSections() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSections = async () => {
      setIsFetching(true);
      setError("");
      try {
        const { data } = await axios.get(`${API}/instructor/sections`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Group sections by course
        const grouped = Object.values(
          (data.sections || []).reduce((acc, sec) => {
            const id = sec.course._id;
            if (!acc[id]) acc[id] = { course: sec.course, sections: [] };
            acc[id].sections.push(sec);
            return acc;
          }, {})
        );

        setCourses(grouped);
      } catch (err) {
        console.error("Error fetching sections:", err);
        setError("Unable to load your courses. Please refresh or try later.");
      } finally {
        setIsFetching(false);
      }
    };

    fetchSections();
  }, [token]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="text-blue-600 w-6 h-6" />
        <h2 className="text-2xl font-bold text-gray-900">My Courses</h2>
      </div>

      {isFetching && (
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="animate-spin w-5 h-5 text-blue-600" />
          Loading courses…
        </div>
      )}

      {!isFetching && error && (
        <div className="p-4 mb-4 bg-red-50 text-red-700 border border-red-200 rounded">
          {error}
        </div>
      )}

      {!isFetching && !error && courses.length === 0 && (
        <p className="text-gray-600">No courses assigned yet.</p>
      )}

      {!isFetching && !error && courses.length > 0 && (
        <div className="space-y-4">
          {courses.map(({ course, sections }) => (
            <div
              key={course.code} // use course code as key instead of _id
              className="flex items-center justify-between bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition p-4"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {course.name}
                </h3>
                <p className="text-sm text-gray-600">
                  Course Code: {course.code}
                </p>
              </div>

              <button
                onClick={() =>
                  navigate(`/instructor/course/${course.code}/sections`, {
                    state: { course, sections },
                  })
                }
                className="px-3 py-1 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                View Sections
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
