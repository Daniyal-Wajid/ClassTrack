// models/Session.js
import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema(
  {
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // ❌ make it optional
    },
    hardInstructor: {
      type: Boolean,
      default: false,
    },
    startedBy: {
      type: String, // "hardinstructor" or a real user id
    },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },

    status: {
      type: String,
      enum: ["ongoing", "ended"],
      default: "ongoing",
    },

    cameraLogs: [{ type: mongoose.Schema.Types.ObjectId, ref: "CameraLog" }],
  },
  { timestamps: true }
);

export default mongoose.model("Session", SessionSchema);
