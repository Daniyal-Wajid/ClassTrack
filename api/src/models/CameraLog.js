import mongoose from "mongoose";

const StudentStatusSchema = new mongoose.Schema(
  {
    id: Number, // index in frame
    bbox: [Number], // [x, y, w, h]
    flags: [String], // ["looking_away", "standing", "looking_at_other", ...]
    suspicious: { type: Boolean, default: false },
  },
  { _id: false }
);

const CameraLogSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional
    facesDetected: { type: Number, default: 0 },
    suspicious: { type: Boolean, default: false },
    message: { type: String },
    image: { type: String }, // base64 snapshot with boxes
    students: [StudentStatusSchema], // per-student breakdown
  },
  { timestamps: true }
);

export default mongoose.model("CameraLog", CameraLogSchema);
