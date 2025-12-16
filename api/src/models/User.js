import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["instructor", "admin", "student"], // ✅ no students
      default: "instructor",
    },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Password comparison helper
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
