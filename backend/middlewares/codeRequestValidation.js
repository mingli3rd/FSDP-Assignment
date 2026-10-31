const Joi = require('joi');

const schema = Joi.object({
  channel: Joi.string().min(1).required(),
  message: Joi.string().allow('').optional(),
});

function validateCodeRequest(req, res, next) {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
}

module.exports = { validateCodeRequest };
