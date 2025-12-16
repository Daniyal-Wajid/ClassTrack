// app.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import externalRoutes from "./routes/externalRoutes.js";
import behaviorRoutes from "./routes/behaviorRoutes.js";
import cameraRoutes from "./routes/cameraRoutes.js";
import adminRoutes from "./routes/admin.js";
import instructorRoutes from "./routes/instructor.js";
import sessionRoutes from "./routes/sessions.js";
import rfidRoutes from "./routes/rfidRoutes.js";

const app = express();

// allow bigger payloads (10 MB here, adjust as needed)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(cors({ origin: true, credentials: true }));
app.use(morgan("dev"));

app.get("/", (req, res) => res.json({ ok: true, service: "ClassTrack API" }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/external", externalRoutes);
app.use("/api/behavior", behaviorRoutes);
app.use("/api/camera", cameraRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/instructor", instructorRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/rfid", rfidRoutes);

// Not found
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

export default app;
