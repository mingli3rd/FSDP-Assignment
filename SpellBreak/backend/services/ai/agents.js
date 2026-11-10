// The AI security agent (SCRUM-17).
//
//   analyze()  = the orchestrator: masks personal data, sends the content to the
//                right agents in parallel, then combines their findings.
//   textAgent  -> messages, links, transcripts (LLM)
//   imageAgent -> screenshots, photos, QR codes (LLM with vision)
//   voiceAgent -> voice notes: Whisper transcript, then text analysis (used by the spike;
//                 the voice/video route comes in SCRUM-35)
//   combineFindings -> merges everything into ONE result:
//                 Likely scam / Some scam signs / No common scam signs (never "Safe")

const ai = require("./openaiClient");
const prompts = require("./prompts");
const { maskPersonalData, wrapUntrusted } = require("./privacy");

const LEVEL_RANK = { no_common_signs: 0, some_signs: 1, likely_scam: 2 };

// ---------- Agents ----------

async function textAgent(maskedText, source) {
  const where = source ? ` (received via ${source})` : "";
  const reply = await ai.askForJson(prompts.TEXT_AGENT, `Message to check${where}:\n${wrapUntrusted(maskedText, "message")}`);
  return { agent: "text", ...reply };
}

// image: { buffer, mimetype } from an upload, or { path } from disk (spike)
async function imageAgent(image, maskedNote) {
  const imagePart = image.buffer ? ai.imagePartFromBuffer(image.buffer, image.mimetype) : ai.imagePartFromFile(image.path);
  const note = maskedNote ? `Customer's note:\n${wrapUntrusted(maskedNote, "note")}` : "Check this image.";
  const reply = await ai.askForJson(prompts.IMAGE_AGENT, [{ type: "text", text: note }, imagePart]);
  return { agent: "image", ...reply };
}

async function voiceAgent(filePath) {
  const { transcript, model: transcribeModel } = await ai.transcribeAudio(filePath);
  const masked = maskPersonalData(transcript).text;
  const reply = await ai.askForJson(prompts.VOICE_AGENT, `Call / voice note transcript:\n${wrapUntrusted(masked, "transcript")}`);
  return { agent: "voice", transcript: masked, transcribeModel, ...reply };
}

// ---------- Combine ----------

const unique = (items, key = (x) => x.toLowerCase()) => {
  const seen = new Set();
  return items.filter((item) => {
    const k = key(item);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

/**
 * Merges the agents' findings into one result in the same fixed format.
 * The most serious level wins: if the text looks fine but the image is a fake bank alert,
 * the customer must still be warned.
 *
 * extras is where later tickets plug in:
 *   extras.deepfakeScore (SCRUM-55): 0-1 likelihood from the deepfake scan service
 */
function combineFindings(findings, extras = {}) {
  const results = findings.map((f) => f.result);
  const ranked = [...results].sort(
    (a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || b.confidence - a.confidence
  );
  const top = ranked[0];

  let level = top.level;
  let confidence = top.confidence;

  // Hook for SCRUM-55: a strong deepfake score raises the level by one step
  if (typeof extras.deepfakeScore === "number" && extras.deepfakeScore >= 0.7 && level !== "likely_scam") {
    level = level === "no_common_signs" ? "some_signs" : "likely_scam";
    confidence = Math.max(confidence, extras.deepfakeScore);
  }

  const firstNonEmpty = (field) => (ranked.find((r) => r[field]) || {})[field] || "";
  const scamTypeSource = ranked.find((r) => !["none", "other"].includes(r.scam_type)) || top;

  return {
    level,
    confidence: Math.round(confidence * 100) / 100,
    claimed_identity: firstNonEmpty("claimed_identity"),
    requested_action: firstNonEmpty("requested_action"),
    tricks: unique(ranked.flatMap((r) => r.tricks), (t) => `${t.name}|${t.quote}`.toLowerCase()).slice(0, 6),
    extracted: {
      links: unique(ranked.flatMap((r) => r.extracted.links)),
      phone_numbers: unique(ranked.flatMap((r) => r.extracted.phone_numbers)),
      bank_accounts: unique(ranked.flatMap((r) => r.extracted.bank_accounts)),
    },
    scam_type: level === "no_common_signs" ? "none" : scamTypeSource.scam_type === "none" ? "other" : scamTypeSource.scam_type,
    ai_indicators: {
      public_figure_endorsement: results.some((r) => r.ai_indicators.public_figure_endorsement),
      claims_known_person: results.some((r) => r.ai_indicators.claims_known_person),
      personal_details_used: results.some((r) => r.ai_indicators.personal_details_used),
      ai_generated_signs: unique(results.flatMap((r) => r.ai_indicators.ai_generated_signs)),
    },
    safe_actions: unique(ranked.flatMap((r) => r.safe_actions)).slice(0, 4),
  };
}

// ---------- Orchestrator ----------

/**
 * input: { text?, source?, note?, images?: [{ buffer, mimetype } | { path }], audioPath? }
 * returns { final, findings, maskedText, maskedNote, privacy: { cards, nric, otp } }
 */
async function analyze(input) {
  const maskedText = maskPersonalData(input.text);
  const maskedNote = maskPersonalData(input.note);
  const privacy = {
    cards: maskedText.masked.cards + maskedNote.masked.cards,
    nric: maskedText.masked.nric + maskedNote.masked.nric,
    otp: maskedText.masked.otp + maskedNote.masked.otp,
  };

  const jobs = [];
  if (maskedText.text) jobs.push(textAgent(maskedText.text, input.source));
  (input.images || []).forEach((img) => jobs.push(imageAgent(img, maskedNote.text)));
  if (input.audioPath) jobs.push(voiceAgent(input.audioPath));

  if (jobs.length === 0) {
    throw new Error("Nothing to analyse - provide text, an image or an audio file.");
  }

  const findings = await Promise.all(jobs); // agents run at the same time
  const final = combineFindings(findings, input.extras);

  return { final, findings, maskedText: maskedText.text, maskedNote: maskedNote.text, privacy };
}

module.exports = {
  textAgent,
  imageAgent,
  voiceAgent,
  combineFindings,
  analyze,
};
