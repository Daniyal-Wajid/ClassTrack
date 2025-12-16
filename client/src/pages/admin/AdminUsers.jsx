import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { User, GraduationCap, Plus, Edit, Trash2, X } from "lucide-react";

const API = process.env.REACT_APP_API_URL;

export default function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", role: "student", password: "" });

  // ---------------- Fetch Users ----------------
  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data.users || []);
    } catch (err) {
      console.error("Error fetching users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  // ---------------- CRUD ----------------
  const handleSave = async () => {
    try {
      if (editingUser) {
        await axios.put(`${API}/admin/users/${editingUser._id}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API}/admin/users`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      fetchUsers();
      setShowForm(false);
      setEditingUser(null);
      setForm({ name: "", email: "", role: "student", password: "" });
    } catch (err) {
      console.error("Error saving user", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(`${API}/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchUsers();
    } catch (err) {
      console.error("Error deleting user", err);
    }
  };

  // ---------------- Derived Data ----------------
  const instructors = users.filter((u) => u.role === "instructor");
  const students = users.filter((u) => u.role === "student");

  const chartData = [
    { name: "Instructors", value: instructors.length },
    { name: "Students", value: students.length },
  ];
  const COLORS = ["#2563eb", "#10b981"];

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  // ---------------- Components ----------------
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      <div className="h-48 bg-gray-200 animate-pulse rounded-lg" />
      <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />
    </div>
  );

  const EmptyState = () => (
    <div className="text-center text-gray-500 text-sm py-8">
      No users found.
      <button
        onClick={fetchUsers}
        className="ml-2 text-blue-600 hover:underline text-xs"
      >
        Refresh
      </button>
    </div>
  );

  const UserFormModal = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {editingUser ? "Edit User" : "Create User"}
          </h3>
          <button onClick={() => setShowForm(false)}>
            <X />
          </button>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border rounded px-3 py-2"
          />
          {!editingUser && (
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          )}
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full border rounded px-3 py-2"
          >
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
          </select>
        </div>
        <div className="flex justify-end mt-4 gap-2">
          <button
            onClick={() => setShowForm(false)}
            className="px-3 py-2 bg-gray-200 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-2 bg-blue-600 text-white rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );

  // ---------------- Render ----------------
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Manage Users</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search by name or email..."
            className="border rounded-lg px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-full sm:w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={() => {
              setEditingUser(null);
              setForm({ name: "", email: "", role: "student", password: "" });
              setShowForm(true);
            }}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-1"
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Distribution Chart */}
          <div className="bg-white rounded-xl shadow p-4 flex flex-col justify-center">
            <h3 className="text-base font-semibold mb-2">User Distribution</h3>
            <div className="h-48">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl shadow p-4 lg:col-span-2">
            <h3 className="text-base font-semibold mb-3">All Users</h3>
            {filtered.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="overflow-x-auto max-h-[60vh]">
                <table className="min-w-full text-sm border border-gray-200">
                  <thead className="bg-gray-50 text-gray-700 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Role</th>
                      <th className="px-3 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, idx) => (
                      <tr
                        key={u._id}
                        className={`${
                          idx % 2 === 0 ? "bg-gray-50" : "bg-white"
                        } hover:bg-blue-50 transition`}
                      >
                        <td className="px-3 py-2 font-medium">{u.name}</td>
                        <td className="px-3 py-2 text-gray-600">{u.email}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                              u.role === "instructor"
                                ? "bg-blue-100 text-blue-700"
                                : u.role === "admin"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {u.role === "instructor" ? (
                              <User size={12} />
                            ) : u.role === "admin" ? (
                              <span className="font-bold">A</span>
                            ) : (
                              <GraduationCap size={12} />
                            )}
                            {u.role}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            className="text-blue-600 hover:underline mr-2"
                            onClick={() => {
                              setEditingUser(u);
                              setForm({
                                name: u.name,
                                email: u.email,
                                role: u.role,
                                password: "",
                              });
                              setShowForm(true);
                            }}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className="text-red-600 hover:underline"
                            onClick={() => handleDelete(u._id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showForm && <UserFormModal />}
    </div>
  );
}
