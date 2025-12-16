import mongoose from "mongoose";

const BehaviorSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
    },
    status: {
      type: String,
      enum: ["present", "absent", "suspicious"],
      required: true,
    },
    details: { type: String },
    snapshot: {
      name: String,
      email: String,
    }, // optional redundancy
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Behavior", BehaviorSchema);
