const Joi = require('joi');

const schema = Joi.object({
  status: Joi.string().valid('open', 'in_review', 'escalated', 'closed').required(),
});

function validateCaseUpdate(req, res, next) {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
}

module.exports = { validateCaseUpdate };
