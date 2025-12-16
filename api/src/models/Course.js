import mongoose from "mongoose";

const CourseSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // e.g. CS101
    name: { type: String, required: true }, // e.g. "Intro to Programming"
    sections: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Section",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Course", CourseSchema);
