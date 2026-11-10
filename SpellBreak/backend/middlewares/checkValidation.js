const Joi = require("joi");

// POST /api/checks (multipart form, so multer runs first and fills req.body)
const checkSchema = Joi.object({
  mode: Joi.string().valid("text", "image").required().messages({
    "any.only": "mode must be 'text' or 'image'",
    "any.required": "mode is required",
  }),
  source: Joi.string().max(30).allow("").optional(),
  text: Joi.when("mode", {
    is: "text",
    then: Joi.string().trim().min(3).max(5000).required().messages({
      "string.min": "Paste a bit more of the message (at least 3 characters).",
      "string.max": "Message must be under 5000 characters.",
      "any.required": "Paste the message or link to check.",
      "string.empty": "Paste the message or link to check.",
    }),
    otherwise: Joi.string().max(1000).allow("").optional(), // optional note with an image
  }),
});

function validateCheck(req, res, next) {
  const { error } = checkSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessage = error.details.map((d) => d.message).join(", ");
    return res.status(400).json({ error: errorMessage });
  }
  if (req.body.mode === "image" && !req.file) {
    return res.status(400).json({ error: "Choose a screenshot or QR code to check." });
  }
  next();
}

module.exports = {
  validateCheck,
};
