import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";


const AuthCtx = createContext(null);
const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const storedUser = JSON.parse(localStorage.getItem("user"));

export function AuthProvider({ children }) {
const [user, setUser] = useState(storedUser || null);
const [token, setToken] = useState(localStorage.getItem("token"));


useEffect(() => {
if (!token) return;
axios
.get(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
.then((res) => setUser(res.data.user))
.catch(() => logout());
}, [token]);


const login = async (email, password) => {
  const { data } = await axios.post(`${API}/auth/login`, { email, password });
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  setToken(data.token);
  setUser(data.user);
  return data.user; // ✅ return user
};

const register = async (payload) => {
  const { data } = await axios.post(`${API}/auth/register`, payload);
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  setToken(data.token);
  setUser(data.user);
  return data.user; // ✅ return user
};



const logout = () => {
localStorage.removeItem("token");
setToken(null);
setUser(null);
};


return (
<AuthCtx.Provider value={{ user, token, login, register, logout }}>
{children}
</AuthCtx.Provider>
);
}


export const useAuth = () => useContext(AuthCtx);