import multer from "multer";
import path from "path";

// Set up the disk storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Set where to store the files
    cb(null, "uploads/"); // Upload folder
  },
  filename: (req, file, cb) => {
    // Generate a unique filename using current timestamp
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// Create the Multer upload instance
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
}).single("image"); // 'image' is the name of the form field

export default upload;
