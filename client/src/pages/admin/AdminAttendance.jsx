import { useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const API = process.env.REACT_APP_API_URL;

export default function AdminAttendance() {
  const { token } = useAuth();
  const [courseId, setCourseId] = useState("");
  const [attendance, setAttendance] = useState([]);
const [sectionId, setSectionId] = useState("");
const fetchAttendance = async () => {
  const { data } = await axios.get(`${API}/attendance/section/${sectionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  setAttendance(data.attendance);
};
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Admin Attendance</h2>

      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Enter Course ID"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="border px-3 py-2 rounded w-64"
        />
        <button
          onClick={fetchAttendance}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          View Attendance
        </button>
      </div>

      {attendance.length > 0 && (
        <table className="w-full border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Student</th>
              <th className="p-2 border">Session</th>
              <th className="p-2 border">Status</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((a) => (
              <tr key={a._id}>
                <td className="p-2 border">{a.student?.name}</td>
                <td className="p-2 border">
                  {new Date(a.session?.startTime).toLocaleString()}
                </td>
                <td className="p-2 border capitalize">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
