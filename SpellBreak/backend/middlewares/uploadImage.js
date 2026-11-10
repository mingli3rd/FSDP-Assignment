const multer = require("multer");

// Images are kept in memory only (never written to disk) and sent straight to the AI.
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PNG, JPG, WEBP or GIF images can be checked."));
  },
});

// Wraps multer so upload problems return a clear 400 instead of crashing the route.
// The form field for the image must be called "file".
function uploadCheckImage(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();
    const message = err.code === "LIMIT_FILE_SIZE" ? "Image must be 10 MB or smaller." : err.message;
    return res.status(400).json({ error: message });
  });
}

module.exports = {
  uploadCheckImage,
};
