// src/models/Attendance.js
import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema(
  {
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: { type: String, enum: ["present", "absent"], default: "absent" },
    checkInTime: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Attendance", AttendanceSchema);
