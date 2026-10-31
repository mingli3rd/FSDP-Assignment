const Joi = require('joi');

const schema = Joi.object({
  content: Joi.string().min(1).required(),
});

function validateMessageCheck(req, res, next) {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
}

module.exports = { validateMessageCheck };
