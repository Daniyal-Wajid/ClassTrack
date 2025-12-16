import Course from "../models/Course.js";
import Section from "../models/Section.js";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";

// ---------------- Create a course ----------------
export const createCourse = async (req, res) => {
  try {
    const { code, name } = req.body;
    if (!code || !name) {
      return res.status(400).json({ message: "Code & name required" });
    }

    const exists = await Course.findOne({ code });
    if (exists) {
      return res.status(400).json({ message: "Course code already exists" });
    }

    const course = await Course.create({ code, name });
    res.status(201).json({ course });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating course", error: err.message });
  }
};

// ---------------- Update a course ----------------
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name } = req.body;
    const course = await Course.findByIdAndUpdate(
      id,
      { code, name },
      { new: true }
    );
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json({ course });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating course", error: err.message });
  }
};

// ---------------- Delete a course (+ its sections) ----------------
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByIdAndDelete(id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    await Section.deleteMany({ course: id });
    res.json({ message: "Course and its sections deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting course", error: err.message });
  }
};

// ---------------- Create section under a course ----------------
export const createSection = async (req, res) => {
  try {
    const { courseId, name, instructorId } = req.body;
    if (!courseId || !name) {
      return res
        .status(400)
        .json({ message: "Course & section name required" });
    }

    const sectionData = { course: courseId, name };

    if (instructorId === "hardinstructor") {
      sectionData.instructor = null;
      sectionData.hardInstructor = true;
    } else if (instructorId) {
      sectionData.instructor = instructorId;
      sectionData.hardInstructor = false;
    }

    const section = await Section.create(sectionData);
    await Course.findByIdAndUpdate(courseId, {
      $push: { sections: section._id },
    });

    const populated = await Section.findById(section._id)
      .populate("instructor", "name email")
      .lean();

    if (populated.hardInstructor) {
      populated.instructor = {
        _id: "hardinstructor",
        name: "Hardcoded Instructor",
        email: process.env.INSTRUCTOR_EMAIL,
      };
    }

    res.status(201).json({ section: populated });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating section", error: err.message });
  }
};

// ---------------- Update section name ----------------
export const updateSection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { name } = req.body;
    const section = await Section.findByIdAndUpdate(
      sectionId,
      { name },
      { new: true }
    ).populate("instructor", "name email");

    if (!section) return res.status(404).json({ message: "Section not found" });
    res.json({ section });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating section", error: err.message });
  }
};

// ---------------- Delete section ----------------
export const deleteSection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const section = await Section.findByIdAndDelete(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    await Course.findByIdAndUpdate(section.course, {
      $pull: { sections: sectionId },
    });
    res.json({ message: "Section deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting section", error: err.message });
  }
};

// ---------------- Assign / remove instructor ----------------
export const assignInstructor = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { instructorId } = req.body;

    let section;
    if (!instructorId) {
      section = await Section.findByIdAndUpdate(
        sectionId,
        { instructor: null, hardInstructor: false },
        { new: true }
      ).lean();
      section.instructor = null;
    } else if (instructorId === "hardinstructor") {
      section = await Section.findByIdAndUpdate(
        sectionId,
        { instructor: null, hardInstructor: true },
        { new: true }
      ).lean();
      section.instructor = {
        _id: "hardinstructor",
        name: "Hardcoded Instructor",
        email: process.env.INSTRUCTOR_EMAIL,
      };
    } else {
      section = await Section.findByIdAndUpdate(
        sectionId,
        { instructor: instructorId, hardInstructor: false },
        { new: true }
      ).populate("instructor", "name email");
    }

    res.json({ section });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error assigning instructor", error: err.message });
  }
};

// ---------------- Enroll (assign) students to section ----------------
export const enrollStudents = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { studentIds } = req.body;

    const section = await Section.findById(sectionId);
    if (!section) return res.status(404).json({ message: "Section not found" });

    // Ensure no duplicates
    const uniqueStudents = Array.from(
      new Set([...section.enrolledStudents.map(String), ...studentIds])
    );

    section.enrolledStudents = uniqueStudents;
    await section.save();

    res.json({ success: true, enrolledStudents: uniqueStudents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to enroll students" });
  }
};

// ---------------- Get all courses with sections + instructors ----------------
export const getCoursesWithSections = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate({
        path: "sections",
        populate: [
          { path: "instructor", select: "name email" },
          { path: "enrolledStudents", select: "name email studentId" },
        ],
      })
      .lean();

    courses.forEach((course) => {
      if (!course.sections) course.sections = [];
      course.sections.forEach((sec) => {
        if (sec?.hardInstructor) {
          sec.instructor = {
            _id: "hardinstructor",
            name: "Hardcoded Instructor",
            email: process.env.INSTRUCTOR_EMAIL || "hardcoded@demo.com",
          };
        }
      });
    });

    res.json({ courses });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching data", error: err.message });
  }
};

// ---------------- Get all users ----------------
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("name email role studentId");
    const hardcodedInstructor = {
      _id: "hardinstructor",
      name: "Hardcoded Instructor",
      email: process.env.INSTRUCTOR_EMAIL,
      role: "instructor",
    };
    res.json({ users: [...users, hardcodedInstructor] });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching users", error: err.message });
  }
};

// ---------------- Get only instructors ----------------
export const getInstructors = async (req, res) => {
  try {
    const instructors = await User.find({ role: "instructor" }).select(
      "name email role"
    );
    const hardcodedInstructor = {
      _id: "hardinstructor",
      name: "Hardcoded Instructor",
      email: process.env.INSTRUCTOR_EMAIL,
      role: "instructor",
    };
    res.json({ users: [...instructors, hardcodedInstructor] });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching instructors", error: err.message });
  }
};

// ---------------- Create course + section in one go ----------------
export const createCourseWithSection = async (req, res) => {
  try {
    const { code, name, sectionName, instructorId } = req.body;
    if (!code || !name || !sectionName || !instructorId) {
      return res.status(400).json({
        message: "Course code, name, section name, and instructor are required",
      });
    }

    const exists = await Course.findOne({ code });
    if (exists) {
      return res.status(400).json({ message: "Course code already exists" });
    }

    const course = await Course.create({ code, name });
    const sectionData = { course: course._id, name: sectionName };

    if (instructorId === "hardinstructor") {
      sectionData.instructor = null;
      sectionData.hardInstructor = true;
    } else {
      sectionData.instructor = instructorId;
      sectionData.hardInstructor = false;
    }

    const section = await Section.create(sectionData);
    await Course.findByIdAndUpdate(course._id, {
      $push: { sections: section._id },
    });

    const newCourse = await Course.findById(course._id)
      .populate({
        path: "sections",
        populate: { path: "instructor", select: "name email" },
      })
      .lean();

    newCourse.sections.forEach((sec) => {
      if (sec.hardInstructor) {
        sec.instructor = {
          _id: "hardinstructor",
          name: "Hardcoded Instructor",
          email: process.env.INSTRUCTOR_EMAIL,
        };
      }
    });

    res.status(201).json({ course: newCourse });
  } catch (err) {
    res.status(500).json({
      message: "Error creating course with section",
      error: err.message,
    });
  }
};

// ---------------- Get attendance reports ----------------
export const getAttendanceReports = async (req, res) => {
  try {
    const attendance = await Attendance.find()
      .populate("student", "name email studentId")
      .populate({
        path: "session",
        populate: [
          { path: "section", select: "name" },
          { path: "course", select: "code name" },
        ],
      })
      .lean();

    res.json({ attendance });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching attendance reports",
      error: err.message,
    });
  }
};

// ---------------- Create User ----------------
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ name, email, passwordHash: hashedPassword, role });
    await user.save();

    res.status(201).json(user);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating user", error: err.message });
  }
};

// ---------------- Update User ----------------
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password } = req.body;

    const updateData = { name, email, role };
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10);

    const user = await User.findByIdAndUpdate(id, updateData, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating user", error: err.message });
  }
};

// ---------------- Delete User ----------------
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting user", error: err.message });
  }
};

// ---------------- Get only students ----------------
export const getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "student" }).select(
      "name email role studentId"
    );
    res.json({ users: students });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching students", error: err.message });
  }
};
