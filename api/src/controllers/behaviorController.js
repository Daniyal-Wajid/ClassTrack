import Behavior from "../models/Behavior.js";

// Save behavior result from AI
export const logBehavior = async (req, res) => {
  try {
    const { studentId, status, details, sessionId } = req.body;

    const behavior = await Behavior.create({
      student: studentId,
      session: sessionId || null,
      status,
      details,
    });

    res.json({ success: true, behavior });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error logging behavior", error: err.message });
  }
};

// Get all logs for a student
export const getStudentBehavior = async (req, res) => {
  try {
    const { studentId } = req.params;
    const logs = await Behavior.find({ student: studentId })
      .populate("student", "name email")
      .sort({ createdAt: -1 });

    res.json({ logs });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching logs", error: err.message });
  }
};

// Get all logs for a session (for instructor)
export const getSessionBehavior = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const logs = await Behavior.find({ session: sessionId })
      .populate("student", "name email")
      .sort({ createdAt: -1 });

    res.json({ logs });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching session logs", error: err.message });
  }
};
