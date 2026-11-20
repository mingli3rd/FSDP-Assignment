const Joi = require("joi");

// Validation schema for the one-tap report (POST /api/cases)
const createCaseSchema = Joi.object({
  scam_type: Joi.string().trim().max(50).required().messages({
    "any.required": "Scam type is required",
    "string.empty": "Scam type cannot be empty",
  }),
  looks_like: Joi.string().trim().max(150).required().messages({
    "any.required": "What the case looks like is required",
    "string.empty": "What the case looks like cannot be empty",
  }),
  risk_score: Joi.number().integer().min(0).max(100).required().messages({
    "number.base": "Risk score must be a number",
    "number.min": "Risk score must be between 0 and 100",
    "number.max": "Risk score must be between 0 and 100",
    "any.required": "Risk score is required",
  }),
  amount: Joi.number().min(0).max(100000000).precision(2).allow(null).optional().messages({
    "number.min": "Amount cannot be negative",
  }),
  amount_note: Joi.string().trim().max(150).allow("").optional(),
  source: Joi.string().trim().max(100).required().messages({
    "any.required": "Source is required",
    "string.empty": "Source cannot be empty",
  }),
  evidence: Joi.string().trim().max(4000).required().messages({
    "any.required": "Evidence is required",
    "string.empty": "Include at least one piece of evidence",
    "string.max": "Evidence is too long (max 4000 characters)",
  }),
  signals: Joi.array().items(Joi.string().trim().max(60)).max(10).default([]),
  summary: Joi.string().trim().max(2000).allow("").optional(),
});

// Validation schema for staff actions (POST /api/employee/cases/:id/actions)
const caseActionSchema = Joi.object({
  action: Joi.string().valid("contact", "escalate", "mark_scam", "release", "note").required().messages({
    "any.only": "Action must be contact, escalate, mark_scam, release or note",
    "any.required": "Action is required",
  }),
  note: Joi.string().trim().max(1000).allow("").optional().messages({
    "string.max": "Note is too long (max 1000 characters)",
  }),
});

const caseIdSchema = Joi.number().integer().positive().required();

function validateCreateCase(req, res, next) {
  const { error, value } = createCaseSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessage = error.details.map((d) => d.message).join(", ");
    return res.status(400).json({ error: errorMessage });
  }
  req.body = value; // trimmed, with defaults filled in
  next();
}

function validateCaseAction(req, res, next) {
  const { error, value } = caseActionSchema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessage = error.details.map((d) => d.message).join(", ");
    return res.status(400).json({ error: errorMessage });
  }
  req.body = value;
  next();
}

function validateCaseId(req, res, next) {
  const { error } = caseIdSchema.validate(req.params.id);
  if (error) {
    return res.status(400).json({ error: "Case id must be a positive whole number" });
  }
  next();
}

module.exports = {
  validateCreateCase,
  validateCaseAction,
  validateCaseId,
};
