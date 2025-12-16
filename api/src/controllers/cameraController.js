// controllers/cameraController.js
import CameraLog from "../models/CameraLog.js";
import Session from "../models/Session.js";
import Attendance from "../models/Attendance.js";

export const logCameraEvent = async (req, res) => {
  try {
    const { sessionId, facesDetected, flags } = req.body;

    // create log
    const log = await CameraLog.create({
      sessionId,
      facesDetected,
      flags,
    });

    // attach log to session
    await Session.findByIdAndUpdate(sessionId, {
      $push: { cameraLogs: log._id },
    });

    res.json({ message: "Log saved", log });
  } catch (err) {
    console.error("Error saving camera log:", err);
    res.status(500).json({ message: "Error saving log" });
  }
};

export const getSessionCameraLogs = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId).populate({
      path: "cameraLogs",
      options: { sort: { createdAt: -1 } },
    });

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.json({ logs: session.cameraLogs });
  } catch (err) {
    console.error("Error fetching logs:", err);
    res.status(500).json({ message: "Error fetching logs" });
  }
};
