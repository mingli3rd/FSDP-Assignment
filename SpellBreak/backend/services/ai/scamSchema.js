// The fixed JSON format every agent must return (SCRUM-40 acceptance criterion).
// Used as an OpenAI "structured output" schema, so the model is forced to
// return exactly these fields - no free text we have to parse.

const VERDICTS = ["scam", "suspicious", "safe"];

const SCAM_TYPES = [
  "voice_clone_family",   // cloned voice of a child/parent asking for money
  "voice_clone_bank",     // AI voice pretending to be OCBC / bank staff
  "deepfake_executive",   // deepfake boss / CEO asking for a payment
  "deepfake_government",  // deepfake police / MAS / government officer
  "ai_phishing_message",  // AI-written text pretending to be a bank / company
  "ai_generated_image",   // fake screenshot, ID, receipt or photo made by AI
  "investment_deepfake",  // deepfake celebrity / expert promoting an investment
  "other",
  "none",                 // use with verdict "safe"
];

const scamResultSchema = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "confidence", "tricks", "ai_generated_signs", "scam_type", "safe_actions"],
  properties: {
    verdict: { type: "string", enum: VERDICTS },
    confidence: {
      type: "number",
      description: "0 to 1. How sure the agent is about the verdict.",
    },
    tricks: {
      type: "array",
      description: "Manipulation tricks used, in plain English (e.g. 'urgency: pay before 5pm').",
      items: { type: "string" },
    },
    ai_generated_signs: {
      type: "array",
      description: "Signs the content was made or altered by AI. Empty array if none found.",
      items: { type: "string" },
    },
    scam_type: { type: "string", enum: SCAM_TYPES },
    safe_actions: {
      type: "array",
      description: "2-4 concrete next steps for the customer, e.g. 'Hang up and call OCBC at 6363 3333'.",
      items: { type: "string" },
    },
  },
};

// Light check used by the spike runner to confirm every response matches the format
function isValidResult(result) {
  if (!result || typeof result !== "object") return false;
  return (
    VERDICTS.includes(result.verdict) &&
    typeof result.confidence === "number" &&
    result.confidence >= 0 &&
    result.confidence <= 1 &&
    Array.isArray(result.tricks) &&
    Array.isArray(result.ai_generated_signs) &&
    SCAM_TYPES.includes(result.scam_type) &&
    Array.isArray(result.safe_actions)
  );
}

module.exports = {
  VERDICTS,
  SCAM_TYPES,
  scamResultSchema,
  isValidResult,
};
