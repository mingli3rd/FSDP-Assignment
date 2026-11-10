const Joi = require("joi");

const analyseTextSchema = Joi.object({
  text: Joi.string().trim().max(5000).required().messages({
    "string.empty": "Paste a message or link to check.",
    "any.required": "Paste a message or link to check.",
    "string.max": "That's too long. Paste just the message you received.",
  }),
  paymentId: Joi.number().integer().positive().optional(),
});

const validateAnalyseText = (req, res, next) => {
  const { error, value } = analyseTextSchema.validate(req.body, { abortEarly: true });
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  req.body = value; // use the trimmed version from here on
  next();
};

module.exports = { validateAnalyseText };