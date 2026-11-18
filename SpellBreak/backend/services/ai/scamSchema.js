// The fixed format every AI agent must return (SCRUM-17).
// 1. scamResultJsonSchema -> sent to OpenAI so the model is forced into this shape
// 2. ScamResult (zod)     -> validates the reply in our own code before we trust it

const { z } = require("zod");

// The 3 levels from the flowchart. There is deliberately no "safe":
// we can only say we found no COMMON signs, never that something is safe.
const LEVELS = ["likely_scam", "some_signs", "no_common_signs"];

// Keep these names the same in SCRUM-28 (the scam library) so matching is a simple lookup
const SCAM_TYPES = [
  "voice_clone_family",   // cloned voice of a family member asking for money
  "voice_clone_bank",     // AI voice pretending to be bank staff
  "deepfake_executive",   // deepfake boss / CEO asking for a payment
  "deepfake_government",  // deepfake police / MAS / government officer
  "deepfake_investment",  // deepfake celebrity or expert promoting an investment
  "ai_phishing_message",  // AI-written message pretending to be a bank or company
  "ai_generated_image",   // fake screenshot, receipt, ID or product photo made by AI
  "ecommerce_scam",       // fake seller, pay first, never delivers
  "job_scam",             // pay to work / top-up tasks
  "other",
  "none",                 // only with level "no_common_signs"
];

// ---------- zod: checks the reply in our code ----------
const ScamResult = z.object({
  level: z.enum(LEVELS),
  confidence: z.number().min(0).max(1),
  claimed_identity: z.string(), // who the sender says they are, "" if unclear
  requested_action: z.string(), // what they want you to do, "" if nothing
  tricks: z.array(
    z.object({
      name: z.string(),  // e.g. "Urgency"
      quote: z.string(), // the exact words from the content
    })
  ),
  extracted: z.object({
    links: z.array(z.string()),
    phone_numbers: z.array(z.string()),
    bank_accounts: z.array(z.string()),
  }),
  scam_type: z.enum(SCAM_TYPES),
  ai_indicators: z.object({
    public_figure_endorsement: z.boolean(), // "as seen with [celebrity / minister]"
    claims_known_person: z.boolean(),       // pretends to be family, boss, friend
    personal_details_used: z.boolean(),     // uses your name, address, etc. to seem real
    ai_generated_signs: z.array(z.string()),
  }),
  safe_actions: z.array(z.string()),
});

// ---------- JSON schema: the same shape, in the format OpenAI needs ----------
const str = { type: "string" };
const strArray = { type: "array", items: str };
const strict = (properties) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});

const scamResultJsonSchema = strict({
  level: { type: "string", enum: LEVELS },
  confidence: { type: "number", description: "0 to 1" },
  claimed_identity: str,
  requested_action: str,
  tricks: { type: "array", items: strict({ name: str, quote: str }) },
  extracted: strict({ links: strArray, phone_numbers: strArray, bank_accounts: strArray }),
  scam_type: { type: "string", enum: SCAM_TYPES },
  ai_indicators: strict({
    public_figure_endorsement: { type: "boolean" },
    claims_known_person: { type: "boolean" },
    personal_details_used: { type: "boolean" },
    ai_generated_signs: strArray,
  }),
  safe_actions: strArray,
});

// Returns { ok: true, data } or { ok: false, error } - never throws
function parseScamResult(raw) {
  const result = ScamResult.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    error: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
  };
}

module.exports = {
  LEVELS,
  SCAM_TYPES,
  ScamResult,
  scamResultJsonSchema,
  parseScamResult,
};
