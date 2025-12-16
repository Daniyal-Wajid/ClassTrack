// pages/instructor/InstructorCourses.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const API = process.env.REACT_APP_API_URL;

export default function InstructorCourses() {
  const { token } = useAuth();
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    axios
      .get(`${API}/courses/instructor`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setCourses(res.data.courses))
      .catch((err) => console.error("Error fetching courses", err));
  }, [token]);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">My Courses</h2>
      <ul className="list-disc ml-6">
        {courses.length === 0 ? (
          <p className="text-gray-500">No courses assigned yet.</p>
        ) : (
          courses.map((c) => (
            <li key={c._id}>
              {c.name} ({c.code})
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
