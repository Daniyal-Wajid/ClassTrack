import Section from "../models/Section.js";
import Course from "../models/Course.js";
import User from "../models/User.js";
import Session from "../models/Session.js";
import Attendance from "../models/Attendance.js";

// ================================
//  GET ONGOING SESSIONS
// ================================
export const getOngoingSessions = async (req, res) => {
  try {
    let sessions;

    if (req.user.id === "hardinstructor") {
      sessions = await Session.find({
        startedBy: "hardinstructor",
        status: "ongoing",
      })
        .populate("section", "name")
        .populate("course", "name code")
        .lean();

      sessions = sessions.map((session) => ({
        ...session,
        instructor: {
          _id: "hardinstructor",
          name: "Hardcoded Instructor",
          email: process.env.INSTRUCTOR_EMAIL,
        },
      }));

      return res.json({ sessions });
    }

    sessions = await Session.find({
      instructor: req.user.id,
      status: "ongoing",
    })
      .populate("section", "name")
      .populate("course", "name code")
      .populate("instructor", "name email")
      .lean();

    return res.json({ sessions });
  } catch (err) {
    console.error("Error fetching ongoing sessions:", err.message);
    res
      .status(500)
      .json({ message: "Error fetching ongoing sessions", error: err.message });
  }
};

// ================================
//  GET INSTRUCTOR SECTIONS
// ================================
export const getInstructorSections = async (req, res) => {
  try {
    let sections;

    if (req.user.id === "hardinstructor") {
      sections = await Section.find({ hardInstructor: true })
        .populate("course", "name code")
        .lean();

      sections.forEach((s) => {
        s.instructor = {
          _id: "hardinstructor",
          name: "Hardcoded Instructor",
          email: process.env.INSTRUCTOR_EMAIL,
        };
      });

      return res.json({ sections });
    }

    sections = await Section.find({ instructor: req.user.id })
      .populate("course", "name code")
      .populate("instructor", "name email")
      .lean();

    res.json({ sections });
  } catch (err) {
    console.error("Error fetching sections:", err.message);
    res
      .status(500)
      .json({ message: "Error fetching sections", error: err.message });
  }
};

// ================================
//  GET SECTION STUDENTS
// ================================
export const getSectionStudents = async (req, res) => {
  try {
    const section = await Section.findById(req.params.id)
      .populate("course", "name code")
      .populate("enrolledStudents", "name email studentId")
      .lean();

    if (!section) return res.status(404).json({ message: "Section not found" });

    if (
      (!section.instructor || section.instructor === null) &&
      section.hardInstructor
    ) {
      section.instructor = {
        _id: "hardinstructor",
        name: "Hardcoded Instructor",
        email: process.env.INSTRUCTOR_EMAIL,
      };
    }

    const instructorId =
      section?.instructor?._id?.toString() ||
      section?.instructor?.toString() ||
      null;

    if (req.user.role === "instructor") {
      if (
        !(req.user.id === "hardinstructor" && section.hardInstructor) &&
        instructorId !== req.user.id
      ) {
        return res.status(403).json({ message: "Forbidden: Not your section" });
      }
    }

    res.json({ students: section.enrolledStudents || [] });
  } catch (err) {
    console.error("Error fetching section students:", err.message);
    res
      .status(500)
      .json({ message: "Error fetching students", error: err.message });
  }
};

// ================================
//  GET SECTION BY ID
// ================================
export const getSectionById = async (req, res) => {
  try {
    const section = await Section.findById(req.params.id).populate("course");
    if (!section) return res.status(404).json({ message: "Section not found" });

    if (section.instructor === null && section.hardInstructor) {
      section.instructor = {
        _id: "hardinstructor",
        name: "Hardcoded Instructor",
        email: process.env.INSTRUCTOR_EMAIL,
      };
    }

    res.json({ section });
  } catch (err) {
    console.error("Error fetching section:", err.message);
    res
      .status(500)
      .json({ message: "Error fetching section", error: err.message });
  }
};

// ================================
//  GET INSTRUCTOR SECTIONS WITH ATTENDANCE
// ================================
export const getInstructorSectionsWithAttendance = async (req, res) => {
  try {
    let instructorId = req.user.id;
    let sections = [];

    if (instructorId === "hardinstructor") {
      sections = await Section.find({ hardInstructor: true })
        .populate("course", "name code")
        .lean();

      sections.forEach((s) => {
        s.instructor = {
          _id: "hardinstructor",
          name: "Hardcoded Instructor",
          email: process.env.INSTRUCTOR_EMAIL,
        };
      });
    } else {
      sections = await Section.find({ instructor: instructorId })
        .populate("course", "name code")
        .lean();
    }

    const sectionIds = sections.map((s) => s._id);

    const sessions = await Session.find({ section: { $in: sectionIds } })
      .populate("section", "name")
      .populate("course", "name code")
      .sort({ startTime: -1 })
      .lean();

    const sectionsWithAttendance = sections.map((section) => ({
      ...section,
      attendanceSessions: sessions.filter(
        (sess) => sess.section?._id?.toString() === section._id.toString()
      ),
    }));

    res.json({ sections: sectionsWithAttendance });
  } catch (err) {
    console.error("Error fetching instructor sections with attendance:", err);
    res.status(500).json({
      message: "Error fetching instructor attendance report",
      error: err.message,
    });
  }
};

// ================================
//  ✅ GET SECTION ATTENDANCE (FINAL FIXED VERSION)
// ================================
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
