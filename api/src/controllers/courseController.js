import Course from "../models/Course.js";
import Section from "../models/Section.js"; // needed for instructorCourses and cascade delete
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";

// Create a new course (Admin only)
export const createCourse = async (req, res) => {
  try {
    const { name, code } = req.body;
    const exists = await Course.findOne({ code });
    if (exists) {
      return res.status(400).json({ message: "Course code already exists" });
    }

    const course = await Course.create({ name, code });
    res.status(201).json({ course });
  } catch (e) {
    res
      .status(500)
      .json({ message: "Error creating course", error: e.message });
  }
};
export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate({
        path: "sections",
        populate: { path: "instructor", select: "name email" },
      })
      .lean();

    res.json({ courses });
  } catch (e) {
    res
      .status(500)
      .json({ message: "Error fetching courses", error: e.message });
  }
};

// Instructor: get my courses (via sections)
export const getInstructorCourses = async (req, res) => {
  try {
    const sections = await Section.find({ instructor: req.user.id }).populate(
      "course",
      "name code"
    );
    res.json({ sections });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching courses", error: err.message });
  }
};

// Update a course (Admin only)
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;

    const course = await Course.findByIdAndUpdate(
      id,
      { name, code },
      { new: true, runValidators: true }
    );

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({ course });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating course", error: err.message });
  }
};

// Delete a course (Admin only)
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findByIdAndDelete(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Optionally: also delete related sections
    await Section.deleteMany({ course: id });

    res.json({ message: "Course and related sections deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting course", error: err.message });
  }
};
// Get all instructors
export const getInstructors = async (req, res) => {
  try {
    const { role } = req.query;
    const query = role ? { role } : { role: "instructor" };

    const instructors = await User.find(query).select("name email role").lean();

    // ✅ Add hardcoded instructor
    instructors.push({
      _id: "hardinstructor",
      name: "Hardcoded Instructor",
      email: process.env.INSTRUCTOR_EMAIL,
      role: "instructor",
    });

    res.json({ users: instructors });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching instructors", error: err.message });
  }
};
