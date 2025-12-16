import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const API = process.env.REACT_APP_API_URL;

export default function AdminSections() {
  const { token } = useAuth();
  const [sections, setSections] = useState([]);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [newSection, setNewSection] = useState({
    courseId: "",
    name: "",
    instructorId: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data } = await axios.get(`${API}/admin/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses(data.courses || []);
      setSections(data.sections || []);

      const usersRes = await axios.get(`${API}/admin/users?role=instructor`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInstructors(usersRes.data.users || []);
    } catch (err) {
      console.error("Error fetching sections:", err);
    }
  };

  const createSection = async () => {
    try {
      await axios.post(`${API}/admin/sections`, newSection, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewSection({ courseId: "", name: "", instructorId: "" });
      fetchData();
    } catch (err) {
      console.error("Error creating section:", err);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Manage Sections</h2>

      {/* Add section */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <select
          value={newSection.courseId}
          onChange={(e) => setNewSection({ ...newSection, courseId: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="">Select Course</option>
          {courses.map((c) => (
            <option key={c._id} value={c._id}>
              {c.code} - {c.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Section Name"
          value={newSection.name}
          onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
          className="border p-2 rounded"
        />

        <select
          value={newSection.instructorId}
          onChange={(e) => setNewSection({ ...newSection, instructorId: e.target.value })}
          className="border p-2 rounded"
        >
          <option value="">Assign Instructor</option>
          {instructors.map((i) => (
            <option key={i._id} value={i._id}>
              {i.name}
            </option>
          ))}
        </select>

        <button
          onClick={createSection}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Add
        </button>
      </div>

      {/* Section list */}
      <ul className="divide-y bg-white rounded shadow">
        {sections.map((s) => (
          <li key={s._id} className="p-4">
            <b>{s.name}</b> ({s.course.code}) - Instructor: {s.instructor?.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
