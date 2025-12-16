import axios from "axios";
import Session from "../models/Session.js";
import Attendance from "../models/Attendance.js";
import Section from "../models/Section.js";
import CameraLog from "../models/CameraLog.js";
import RfidScan from "../models/RfidScan.js";
import { RFID_MAP } from "../config/rfidMap.js";
// -------------------- Start / End Session --------------------

export const startSession = async (req, res) => {
  try {
    const { courseId, sectionId } = req.body;

    const section = await Section.findById(sectionId)
      .populate("course")
      .populate("instructor");

    if (!section) return res.status(404).json({ message: "Section not found" });

    const finalCourseId = courseId || section.course?._id;
    if (!finalCourseId)
      return res.status(400).json({ message: "Course information missing" });

    let existing;
    if (req.user.id === "hardinstructor") {
      existing = await Session.findOne({
        hardInstructor: true,
        status: "ongoing",
      });
    } else {
      existing = await Session.findOne({
        instructor: req.user.id,
        status: "ongoing",
      });
    }

    if (existing) {
      return res.status(400).json({
        message: "You already have an ongoing session",
        session: existing,
      });
    }

    let sessionData = {
      course: finalCourseId,
      section: sectionId,
      startTime: new Date(),
      status: "ongoing",
      startedBy: req.user.id,
    };

    if (section.instructor && section.instructor._id) {
      sessionData.instructor = section.instructor._id;
      sessionData.hardInstructor = false;
    } else if (
      section.hardInstructor === true ||
      section.instructor === "hardinstructor"
    ) {
      if (req.user.id !== "hardinstructor" && !req.user.isSuperAdmin) {
        return res
          .status(403)
          .json({ message: "Forbidden to start hardcoded section" });
      }
      sessionData.instructor = null;
      sessionData.hardInstructor = true;
    } else {
      return res.status(400).json({ message: "Instructor is required." });
    }

    const session = await Session.create(sessionData);
    return res.status(201).json({ session });
  } catch (err) {
    console.error("Error in startSession:", err);
    res
      .status(500)
      .json({ message: "Error starting session", error: err.message });
  }
};

// End session
// ✅ Auto-create absent records when ending session
export const endSession = async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await Session.findById(sessionId).populate({
      path: "section",
      populate: { path: "enrolledStudents", select: "_id" },
    });
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.status === "ended")
      return res.status(400).json({ message: "Session already ended" });

    const enrolled = session.section.enrolledStudents.map((s) =>
      s._id.toString()
    );
    const present = await Attendance.find({ session: sessionId }).distinct(
      "student"
    );
    const missing = enrolled.filter((id) => !present.includes(id));

    if (missing.length > 0) {
      await Attendance.insertMany(
        missing.map((studentId) => ({
          section: session.section._id,
          session: sessionId,
          student: studentId,
          status: "absent",
        }))
      );
    }

    session.status = "ended";
    session.endTime = new Date();
    await session.save();

    res.json({
      message: `Session ended successfully. ${missing.length} marked absent.`,
      session,
    });
  } catch (err) {
    console.error("❌ endSession error:", err);
    res
      .status(500)
      .json({ message: "Error ending session", error: err.message });
  }
};

// -------------------- New: Get current session --------------------
export const getCurrentSession = async (req, res) => {
  try {
    const session = await Session.findOne({
      instructor: req.user.id === "hardinstructor" ? null : req.user.id,
      hardInstructor: req.user.id === "hardinstructor",
      status: "ongoing",
    })
      .populate("course", "name code")
      .populate("section", "name");

    res.json({ session: session || null });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching current session", error: err.message });
  }
};

// -------------------- Attendance --------------------
export const markAttendance = async (req, res) => {
  try {
    const { sessionId, studentId } = req.body;

    // Load session + section (with enrolled students)
    const session = await Session.findById(sessionId).populate({
      path: "section",
      populate: { path: "enrolledStudents", select: "_id" },
    });
    if (!session) return res.status(404).json({ message: "Session not found" });

    const sectionId = session.section?._id;
    if (!sectionId)
      return res.status(500).json({ message: "Session missing section" });

    // Compute enrolled IDs (strings)
    const enrolledIds = (session.section.enrolledStudents || []).map((s) =>
      s._id ? s._id.toString() : s.toString()
    );

    // Check DB enrollment first
    let isEnrolled = enrolledIds.includes(studentId);

    // Fallback: check RFID_MAP if not found in DB
    if (!isEnrolled) {
      const found = Object.values(RFID_MAP).find(
        (e) => e.student === studentId
      );
      if (found) {
        console.log(
          "markAttendance: student found in RFID_MAP, allowing mark:",
          found
        );
        isEnrolled = true;
      } else {
        console.warn(
          "markAttendance: student not enrolled and not in RFID_MAP:",
          studentId
        );
      }
    }

    if (!isEnrolled) {
      return res.status(400).json({ message: "Student not enrolled" });
    }

    // Upsert attendance and include section
    const record = await Attendance.findOneAndUpdate(
      { session: sessionId, student: studentId },
      { section: sectionId, status: "present", checkInTime: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ attendance: record });
  } catch (err) {
    console.error("markAttendance error:", err);
    res
      .status(500)
      .json({ message: "Error marking attendance", error: err.message });
  }
};

export const getSectionAttendance = async (req, res) => {
  try {
    const { sectionId } = req.params;
    console.log("📦 Received sectionId:", sectionId);

    if (!sectionId) {
      return res.status(400).json({ message: "Section ID is missing." });
    }

    const section = await Section.findById(sectionId)
      .populate("course", "name code")
      .populate("instructor", "name email")
      .lean();

    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    // 🔐 Authorization
    const userId = req.user?.id;
    const isInstructor =
      section.instructor?._id?.toString() === userId?.toString();
    const isHardInstructor =
      userId === "hardinstructor" && section.hardInstructor === true;
    const isAdmin = req.user?.role === "admin" || req.user?.isSuperAdmin;

    if (!isInstructor && !isHardInstructor && !isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // 🔹 Fetch sessions for this section
    const sessions = await Session.find({ section: sectionId }).lean();

    const attendanceSessions = await Promise.all(
      sessions.map(async (session) => {
        const attendanceRecords = await Attendance.find({
          session: session._id,
          section: sectionId,
          status: "present",
        }).lean(); // ⚡️ no populate to prevent hanging

        const presentStudents = attendanceRecords.map((rec) => {
          // Try to enrich from RFID_MAP
          const rfidEntry = Object.values(RFID_MAP).find(
            (m) => m.student === rec.student.toString()
          );

          return {
            _id: rec.student,
            name: rfidEntry?.name || "Unknown Student",
            studentId: rfidEntry?.studentId || rec.student.toString(),
            email: rfidEntry?.email || "N/A",
            checkInTime: rec.checkInTime,
          };
        });

        return { ...session, presentStudents };
      })
    );

    res.status(200).json({
      section: {
        ...section,
        attendanceSessions,
      },
    });
  } catch (err) {
    console.error("❌ getSectionAttendance error:", err);
    res.status(500).json({
      message: "Failed to fetch section attendance",
      error: err.message,
    });
  }
};
// -------------------- Session Info --------------------
export const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    let session = await Session.findById(id)
      .populate("course", "name code")
      .populate("section", "name")
      .populate("instructor", "name email")
      .populate("cameraLogs")
      .lean();

    if (!session) return res.status(404).json({ message: "Session not found" });

    if (session.hardInstructor || !session.instructor) {
      session.instructor = {
        _id: "hardinstructor",
        name: "Hardcoded Instructor",
        email: process.env.INSTRUCTOR_EMAIL,
      };
    }

    res.json({ session });
  } catch (err) {
    console.error("Error in getSessionById:", err);
    res
      .status(500)
      .json({ message: "Error fetching session", error: err.message });
  }
};

// -------------------- Camera Monitoring --------------------
export const captureFrame = async (req, res) => {
  try {
    const { image } = req.body;
    const sessionId = req.params.id;

    if (!image) return res.status(400).json({ error: "No image provided" });

    // Send frame to Flask AI
    const flaskRes = await axios.post("http://127.0.0.1:5001/camera/upload", {
      image,
    });
    const data = flaskRes.data;

    const facesDetected = data.facesDetected ?? data.faces_detected ?? 0;
    const students = data.students || [];

    // Save log
    const log = await CameraLog.create({
      session: sessionId,
      facesDetected,
      suspicious: students.some((s) => s.suspicious),
      message:
        data.message ||
        (facesDetected === 0
          ? "⚠️ No faces detected"
          : `✅ ${facesDetected} faces detected`),
      image: data.image || image,
      students,
    });

    // Push log ref into Session
    await Session.findByIdAndUpdate(sessionId, {
      $push: { cameraLogs: log._id },
    });

    res.json({ success: true, log });
  } catch (err) {
    console.error("captureFrame error:", err.message);
    res
      .status(500)
      .json({ error: "Failed to process frame", details: err.message });
  }
};

// Fetch camera logs
export const getCameraLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await CameraLog.find({ session: id }).sort({ createdAt: -1 });
    res.json({ logs });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching logs", error: err.message });
  }
};

// in controllers/attendanceController.js
export const getSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId)
      .populate("course", "name code")
      .populate("section", "name")
      .populate("instructor", "name email")
      .lean();

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Handle hardcoded instructor gracefully
    if (session.hardInstructor || !session.instructor) {
      session.instructor = {
        _id: "hardinstructor",
        name: "Hardcoded Instructor",
        email: process.env.INSTRUCTOR_EMAIL,
      };
    }

    return res.json({ session });
  } catch (err) {
    console.error("Error in getSessionDetails:", err);
    return res.status(500).json({
      message: "Error retrieving session details",
      error: err.message,
    });
  }
};

export const recordRfidScan = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { tag } = req.body;
    if (!tag) return res.status(400).json({ message: "RFID tag is required" });

    const session = await Session.findById(sessionId).populate({
      path: "section",
      populate: { path: "enrolledStudents", select: "_id" },
    });
    if (!session) return res.status(404).json({ message: "Session not found" });

    const mapped = RFID_MAP[tag];
    if (!mapped)
      return res.status(400).json({ message: `Unknown RFID tag: ${tag}` });

    // Save raw scan record
    await RfidScan.create({
      session: sessionId,
      tag,
      student: mapped.student,
      scannedBy: req.user?._id,
    });

    const sectionId = session.section?._id;
    // Build enrolled ID list (strings)
    const enrolledIds = (session.section?.enrolledStudents || []).map((s) =>
      s._id ? s._id.toString() : s.toString()
    );

    let isEnrolled = enrolledIds.includes(mapped.student);

    // If not in DB, but exists in RFID_MAP (it does) — allow marking
    if (!isEnrolled) {
      const found = Object.values(RFID_MAP).find(
        (e) => e.student === mapped.student
      );
      if (found) {
        console.log(
          "recordRfidScan: mapped student exists in RFID_MAP:",
          found
        );
        isEnrolled = true;
      }
    }

    if (isEnrolled) {
      // Upsert attendance and include section
      await Attendance.findOneAndUpdate(
        { session: sessionId, student: mapped.student },
        { section: sectionId, status: "present", checkInTime: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } else {
      console.warn(
        "recordRfidScan: student not in enrolled list and not in RFID_MAP:",
        mapped.student
      );
    }

    res.json({ message: `RFID recorded for ${mapped.name}`, student: mapped });
  } catch (err) {
    console.error("recordRfidScan error:", err);
    res.status(500).json({ message: "RFID scan failed", error: err.message });
  }
};

export const getRfidScans = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const scans = await RfidScan.find({ session: sessionId })
      .populate("student", "name email")
      .sort({ createdAt: -1 });

    res.json({ scans });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching RFID scans", error: err.message });
  }
};

// ✅ Get full attendance for a session (present + absent)
export const getSessionAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId).populate("section");
    if (!session) return res.status(404).json({ message: "Session not found" });

    // All enrolled students
    const enrolledStudents = await Section.findById(session.section._id)
      .populate("enrolledStudents", "name email studentId")
      .then((sec) => sec.enrolledStudents);

    // Attendance records for this session
    const attendanceRecords = await Attendance.find({ session: sessionId })
      .populate("student", "name email studentId")
      .lean();

    // Merge present + absent
    const fullList = enrolledStudents.map((student) => {
      const record = attendanceRecords.find(
        (r) => r.student._id.toString() === student._id.toString()
      );
      return record
        ? record
        : {
            _id: null,
            session: sessionId,
            student,
            status: "absent",
            checkInTime: null,
          };
    });

    res.json({ sessionId, attendance: fullList });
  } catch (err) {
    console.error("getSessionAttendance error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch attendance", error: err.message });
  }
};

// ✅ Manual update of attendance
// -------------------- Manual Attendance Update --------------------
export const updateAttendanceManually = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { studentId, status } = req.body;

    console.log("📥 Manual update request:", { sessionId, studentId, status });

    if (!["present", "absent"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const session = await Session.findById(sessionId).populate({
      path: "section",
      populate: { path: "enrolledStudents", select: "_id" },
    });
    if (!session) return res.status(404).json({ message: "Session not found" });

    const sectionId = session.section?._id;
    if (!sectionId)
      return res.status(500).json({ message: "Session missing section" });

    // DB enrolled IDs
    const enrolledIds = (session.section.enrolledStudents || []).map((s) =>
      s._id ? s._id.toString() : s.toString()
    );
    let isEnrolled = enrolledIds.includes(studentId);

    // Fallback to RFID_MAP (if not found in DB)
    if (!isEnrolled) {
      const found = Object.values(RFID_MAP).find(
        (e) => e.student === studentId
      );
      if (found) {
        console.log("updateAttendanceManually: found in RFID_MAP:", found);
        isEnrolled = true;
      } else {
        console.warn(
          "updateAttendanceManually: student not enrolled or not in RFID_MAP:",
          studentId,
          "enrolledIds:",
          enrolledIds
        );
        return res
          .status(400)
          .json({ message: "Student not enrolled or unknown RFID mapping." });
      }
    }

    const record = await Attendance.findOneAndUpdate(
      { session: sessionId, student: studentId },
      {
        section: sectionId,
        status,
        checkInTime: status === "present" ? new Date() : null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(
      "✅ Manual update successful:",
      record._id ? record._id.toString() : record
    );
    res.json({ message: "Attendance updated", record });
  } catch (err) {
    console.error("updateAttendanceManually error:", err);
    res
      .status(500)
      .json({ message: "Failed to update attendance", error: err.message });
  }
};

export const getSectionStudents = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const section = await Section.findById(sectionId).populate(
      "enrolledStudents",
      "name studentId email"
    );

    if (!section) return res.status(404).json({ message: "Section not found" });

    res.json({ students: section.enrolledStudents });
  } catch (err) {
    console.error("getSectionStudents error:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch students", error: err.message });
  }
};
