import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;

export default function AdminManage() {
  const { token } = useAuth();
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
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
        console.error("Error fetching manage data", err);
      }
    };
    fetchAll();
  }, [token]);

  const instructors = users.filter((u) => u.role === "instructor");
  const students = users.filter((u) => u.role === "student");

  return (
    <div className="min-h-screen bg-gray-100 p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Manage All Entities</h2>

      {/* Courses & Sections */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <h3 className="text-lg font-semibold mb-4">Courses & Sections</h3>
        {courses.length === 0 ? (
          <p className="text-gray-500">No courses found.</p>
        ) : (
          <ul className="space-y-2">
            {courses.map((c) => (
              <li key={c._id}>
                <strong>
                  {c.name} ({c.code})
                </strong>
                {c.sections?.length > 0 && (
                  <ul className="ml-6 text-sm text-gray-600 list-disc">
                    {c.sections.map((s) => (
                      <li key={s._id}>
                        {s.name} — Instructor: {s.instructor?.name || "—"}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Instructors */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <h3 className="text-lg font-semibold mb-4">Instructors</h3>
        {instructors.length === 0 ? (
          <p className="text-gray-500">No instructors found.</p>
        ) : (
          <ul className="list-disc pl-5 space-y-1">
            {instructors.map((i) => (
              <li key={i._id}>
                {i.name} ({i.email})
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Students */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Students</h3>
        {students.length === 0 ? (
          <p className="text-gray-500">No students found.</p>
        ) : (
          <ul className="list-disc pl-5 space-y-1">
            {students.map((s) => (
              <li key={s._id}>
                {s.name} ({s.email})
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
