const { analyze } = require("../services/ai/agents");
const { toCustomerResult } = require("../services/resultMapper");

const analyseText = async (req, res) => {
  try {
    const { final } = await analyze({ text: req.body.text });
    res.status(200).json(toCustomerResult(final));
  } catch (error) {
    console.error("analyseText error:", error);
    res
      .status(500)
      .json({ error: "We couldn't check this message right now. Please try again." });
  }
};

module.exports = { analyseText };