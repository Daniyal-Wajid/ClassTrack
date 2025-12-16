import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { Pencil, Trash2, Save, X } from "lucide-react";

const API = process.env.REACT_APP_API_URL;

export default function AdminCourses() {
  const { token } = useAuth();

  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [newCourse, setNewCourse] = useState({
    code: "",
    name: "",
    sectionName: "Default Section",
    instructorId: "",
  });
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---------------- Fetch Data ----------------
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchCourses(), fetchInstructors()]);
      setLoading(false);
    };
    init();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data } = await axios.get(`${API}/admin/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses(data.courses || []);
    } catch (err) {
      setError("Failed to fetch courses");
      console.error(err);
    }
  };

  const fetchInstructors = async () => {
    try {
      const { data } = await axios.get(`${API}/admin/instructors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInstructors(data.users || []);
    } catch (err) {
      setError("Failed to fetch instructors");
      console.error(err);
    }
  };

  // ---------------- Course CRUD ----------------
  const createCourse = async () => {
    if (!newCourse.code || !newCourse.name || !newCourse.instructorId) {
      return alert("Course code, name, and instructor are required!");
    }
    try {
      await axios.post(
        `${API}/admin/courses/full`,
        newCourse,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewCourse({
        code: "",
        name: "",
        sectionName: "Default Section",
        instructorId: "",
      });
      fetchCourses();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create course");
    }
  };

  const updateCourse = async () => {
    if (!editingCourse) return;
    try {
      await axios.put(
        `${API}/admin/courses/${editingCourse._id}`,
        {
          code: editingCourse.code,
          name: editingCourse.name,
          instructorId: editingCourse.instructorId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingCourse(null);
      fetchCourses();
    } catch (err) {
      alert("Failed to update course");
    }
  };

  const deleteCourse = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    try {
      await axios.delete(`${API}/admin/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCourses();
    } catch (err) {
      alert("Failed to delete course");
    }
  };

  // ---------------- Sections ----------------
  const addSection = async (sectionData) => {
    if (!sectionData.courseId || !sectionData.name || !sectionData.instructorId) {
      return alert("All fields are required!");
    }
    try {
      await axios.post(`${API}/admin/sections`, sectionData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCourses();
    } catch (err) {
      alert("Failed to create section");
    }
  };

  const updateSection = async () => {
    if (!editingSection) return;
    try {
      await axios.put(
        `${API}/admin/sections/${editingSection._id}`,
        { name: editingSection.name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingSection(null);
      fetchCourses();
    } catch (err) {
      alert("Failed to update section");
    }
  };

  const deleteSection = async (sectionId) => {
    if (!window.confirm("Are you sure you want to delete this section?")) return;
    try {
      await axios.delete(`${API}/admin/sections/${sectionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCourses();
    } catch (err) {
      alert("Failed to delete section");
    }
  };

  const assignInstructor = async (sectionId, instructorId) => {
    try {
      await axios.post(
        `${API}/admin/sections/${sectionId}/instructor`,
        { instructorId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchCourses();
    } catch (err) {
      alert("Failed to assign/remove instructor");
    }
  };

  // ---------------- Section Form (Fixed) ----------------
  const SectionForm = ({ courseId }) => {
    const [sectionName, setSectionName] = useState("");
    const [instructorId, setInstructorId] = useState("");

    const handleAdd = () => {
      addSection({ courseId, name: sectionName, instructorId });
      setSectionName("");
      setInstructorId("");
    };

    return (
      <div className="grid grid-cols-3 gap-2 mt-3">
        <input
          type="text"
          placeholder="Section Name"
          value={sectionName}
          onChange={(e) => setSectionName(e.target.value)}
          className="border p-1 rounded text-sm"
        />
        <select
          value={instructorId}
          onChange={(e) => setInstructorId(e.target.value)}
          className="border p-1 rounded text-sm"
        >
          <option value="">Assign Instructor</option>
          {instructors.map((i) => (
            <option key={i._id} value={i._id}>
              {i.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white rounded px-2 text-sm hover:bg-blue-700"
        >
          Add
        </button>
      </div>
    );
  };

  // ---------------- Render ----------------
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Manage Courses & Sections</h2>

      {loading ? (
        <p className="text-gray-500">Loading courses...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <>
          {/* Add / Edit Course */}
          {!editingCourse ? (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6 bg-white p-4 rounded shadow">
              <input
                type="text"
                placeholder="Course Code"
                value={newCourse.code}
                onChange={(e) =>
                  setNewCourse({ ...newCourse, code: e.target.value })
                }
                className="border p-2 rounded w-full"
              />
              <input
                type="text"
                placeholder="Course Name"
                value={newCourse.name}
                onChange={(e) =>
                  setNewCourse({ ...newCourse, name: e.target.value })
                }
                className="border p-2 rounded w-full"
              />
              <input
                type="text"
                placeholder="First Section Name"
                value={newCourse.sectionName}
                onChange={(e) =>
                  setNewCourse({ ...newCourse, sectionName: e.target.value })
                }
                className="border p-2 rounded w-full"
              />
              <select
                value={newCourse.instructorId}
                onChange={(e) =>
                  setNewCourse({ ...newCourse, instructorId: e.target.value })
                }
                className="border p-2 rounded w-full"
              >
                <option value="">Assign Instructor</option>
                {instructors.map((i) => (
                  <option key={i._id} value={i._id}>
                    {i.name} ({i.email})
                  </option>
                ))}
              </select>
              <button
                onClick={createCourse}
                className="bg-blue-600 text-white px-4 py-2 rounded col-span-1 sm:col-span-4 hover:bg-blue-700"
              >
                Add Course
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 bg-yellow-50 p-4 rounded">
              <input
                type="text"
                value={editingCourse.code}
                onChange={(e) =>
                  setEditingCourse({ ...editingCourse, code: e.target.value })
                }
                className="border p-2 rounded w-full"
              />
              <input
                type="text"
                value={editingCourse.name}
                onChange={(e) =>
                  setEditingCourse({ ...editingCourse, name: e.target.value })
                }
                className="border p-2 rounded w-full"
              />
              <div className="flex gap-3 col-span-1 sm:col-span-3">
                <button
                  onClick={updateCourse}
                  className="p-2 bg-green-600 text-white rounded hover:bg-green-700"
                  title="Save"
                >
                  <Save size={16} />
                </button>
                <button
                  onClick={() => setEditingCourse(null)}
                  className="p-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Courses List */}
          {courses.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No courses available. Start by adding one above.
            </p>
          ) : (
            <ul className="divide-y bg-white rounded shadow">
              {courses.map((c) => (
                <li key={c._id} className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">
                      {c.code} — {c.name}
                    </span>
                    <div className="flex gap-3 items-center">
                      <button
                        onClick={() => setEditingCourse(c)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Edit Course"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => deleteCourse(c._id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="Delete Course"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Sections */}
                  <div className="ml-4 border-l pl-4">
                    <ul className="text-sm text-gray-700 space-y-1">
                      {c.sections && c.sections.length > 0 ? (
                        c.sections.map((s) => (
                          <li key={s._id}>
                            {editingSection?._id === s._id ? (
                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={editingSection.name}
                                  onChange={(e) =>
                                    setEditingSection({
                                      ...editingSection,
                                      name: e.target.value,
                                    })
                                  }
                                  className="border p-1 rounded text-sm"
                                />
                                <button
                                  onClick={updateSection}
                                  className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                                  title="Save"
                                >
                                  <Save size={14} />
                                </button>
                                <button
                                  onClick={() => setEditingSection(null)}
                                  className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                                  title="Cancel"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <span>
                                  ▸ {s.name} — Instructor:{" "}
                                  <span className="font-medium">
                                    {s.instructor?.name || "—"}
                                  </span>
                                </span>
                                <div className="flex gap-2 items-center">
                                  <select
                                    value={s.instructor?._id || ""}
                                    onChange={(e) =>
                                      assignInstructor(s._id, e.target.value)
                                    }
                                    className="border p-1 rounded text-sm"
                                  >
                                    <option value="">No Instructor</option>
                                    {instructors.map((i) => (
                                      <option key={i._id} value={i._id}>
                                        {i.name}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => setEditingSection(s)}
                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                    title="Edit Section"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => deleteSection(s._id)}
                                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                                    title="Delete Section"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500">No sections yet</li>
                      )}
                    </ul>
                    <SectionForm courseId={c._id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
