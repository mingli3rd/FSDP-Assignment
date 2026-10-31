const Joi = require('joi');

const schema = Joi.object({
  amount: Joi.number().positive().required(),
  recipient: Joi.string().min(1).required(),
});

function validateTransfer(req, res, next) {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
}

module.exports = { validateTransfer };
