import axios from "axios";
import Session from "../models/Session.js";
import CameraLog from "../models/CameraLog.js";
import Attendance from "../models/Attendance.js";

// POST /sessions/:id/capture
export const captureFrame = async (req, res) => {
  try {
    const { id } = req.params;
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ message: "No image provided" });
    }

    // Send frame to Flask AI service
    const flaskRes = await axios.post("http://localhost:5001/camera/upload", {
      image,
    });

    const { faces_detected, boxes } = flaskRes.data;

    // Save to DB
    const log = await CameraLog.create({
      session: id,
      facesDetected: faces_detected,
      boxes,
      suspicious: faces_detected > 1, // simple rule
      message:
        faces_detected > 1
          ? "⚠️ Possible cheating (multiple faces detected)"
          : "✅ Normal behavior",
    });

    // Attach to session
    await Session.findByIdAndUpdate(id, { $push: { cameraLogs: log._id } });

    res.json({ log });
  } catch (err) {
    console.error("Error capturing frame:", err.message);
    res
      .status(500)
      .json({ message: "Error capturing frame", error: err.message });
  }
};

// GET /sessions/:id/logs
export const getSessionLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findById(id).populate({
      path: "cameraLogs",
      options: { sort: { createdAt: -1 } },
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.json({ logs: session.cameraLogs });
  } catch (err) {
    console.error("Error fetching logs:", err.message);
    res
      .status(500)
      .json({ message: "Error fetching logs", error: err.message });
  }
};
