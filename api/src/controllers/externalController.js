// server/src/controllers/externalController.js
import Session from "../models/Session.js";
import Attendance from "../models/Attendance.js";
import Course from "../models/Course.js";
import User from "../models/User.js";

// ✅ Hardcoded instructor
const HARDCODED_INSTRUCTOR = {
  id: "hardcoded-instructor-id",
  name: "Hardcoded Instructor",
  email: "instructor@classtrack.com",
  role: "instructor",
};

// -------------------- GET active session --------------------
export const getActiveSession = async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) {
      return res.status(400).json({ message: "courseId required" });
    }

    const session = await Session.findOne({
      course: courseId,
      status: "ongoing",
    });

    if (!session) {
      return res.json({ session: null });
    }

    // attach hardcoded instructor if match
    const sessionData = session.toObject();
    if (
      sessionData.instructor?.toString() === HARDCODED_INSTRUCTOR.id ||
      !sessionData.instructor
    ) {
      sessionData.instructor = HARDCODED_INSTRUCTOR;
    }

    return res.json({ session: sessionData });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};

// -------------------- POST external attendance --------------------
export const externalMarkAttendance = async (req, res) => {
  try {
    const { sessionId, studentId } = req.body;
    if (!sessionId || !studentId) {
      return res
        .status(400)
        .json({ message: "sessionId and studentId required" });
    }

    // verify session exists
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // verify student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // check duplicates
    let record = await Attendance.findOne({
      session: sessionId,
      student: studentId,
    });
    if (record) {
      return res.json({ attendance: record, alreadyMarked: true });
    }

    record = await Attendance.create({
      session: sessionId,
      student: studentId,
      checkInTime: new Date(),
      status: "present",
    });

    return res.status(201).json({ attendance: record });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};
