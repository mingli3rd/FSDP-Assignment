const agents = require("../services/ai/agents");
const { AiNotConfiguredError } = require("../services/ai/openaiClient");
const checkModel = require("../models/checkModel");

// POST /api/checks - run the AI check on a message/link or an image, save it, return the result
async function createCheck(req, res) {
  const { mode, source, text } = req.body;

  let analysis;
  try {
    analysis = await agents.analyze({
      text: mode === "text" ? text : null,
      note: mode === "image" ? text : null, // optional note sent with an image
      source,
      images: mode === "image" ? [{ buffer: req.file.buffer, mimetype: req.file.mimetype }] : [],
    });
  } catch (error) {
    console.error("AI check error:", error);
    if (error instanceof AiNotConfiguredError) {
      return res.status(503).json({ error: "The AI check isn't set up on this server yet." });
    }
    return res.status(502).json({ error: "The AI check failed. Please try again in a moment." });
  }

  // Save the check. If saving fails, still give the customer their result.
  let checkId = null;
  try {
    checkId = await checkModel.createCheck({
      userId: req.user.id,
      mediaType: mode,
      source,
      maskedText: mode === "text" ? analysis.maskedText : analysis.maskedNote || null, // masked only, never the original
      result: analysis.final,
    });
  } catch (error) {
    console.error("Controller error (saving check):", error);
  }

  res.status(checkId ? 201 : 200).json({
    checkId,
    saved: Boolean(checkId),
    final: analysis.final,
    privacy: analysis.privacy, // how many card numbers / NRICs / OTPs were hidden
  });
}

// GET /api/checks/mine - the customer's check history
async function getMyChecks(req, res) {
  try {
    const checks = await checkModel.getChecksByUser(req.user.id);
    res.status(200).json(checks);
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({ error: "Error loading your checks" });
  }
}

// GET /api/checks/:id - one of the customer's own checks
async function getCheck(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid check ID" });
    }
    const check = await checkModel.getCheckById(id, req.user.id);
    if (!check) {
      return res.status(404).json({ error: "Check not found" });
    }
    res.status(200).json(check);
  } catch (error) {
    console.error("Controller error:", error);
    res.status(500).json({ error: "Error loading check" });
  }
}

module.exports = {
  createCheck,
  getMyChecks,
  getCheck,
};
