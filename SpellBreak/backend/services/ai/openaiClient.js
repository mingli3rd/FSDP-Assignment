// One place that talks to the OpenAI API. Every agent goes through
// askForJson() / transcribeAudio(), so swapping models or providers later
// only means changing this file.
//
// Settings come from .env:
//   OPENAI_API_KEY        your key (never commit it)
//   AI_MODEL              chat + vision model, default gpt-4o-mini
//   AI_TRANSCRIBE_MODEL   speech-to-text model, default whisper-1
//   AI_MOCK=true          fake responses, no key needed (for testing the code path)

const fs = require("fs");
const { scamResultJsonSchema, parseScamResult } = require("./scamSchema");

const MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const TRANSCRIBE_MODEL = process.env.AI_TRANSCRIBE_MODEL || "whisper-1";
const MOCK = process.env.AI_MOCK === "true";

let client = null;

class AiNotConfiguredError extends Error {}

function getClient() {
  if (client) return client;
  if (!process.env.OPENAI_API_KEY) {
    throw new AiNotConfiguredError("OPENAI_API_KEY is missing. Add it to backend/.env (or set AI_MOCK=true to test without a key).");
  }
  const OpenAI = require("openai"); // loaded only when needed, so mock mode works without it
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

// Sends a system prompt + user content and forces the reply into the fixed
// scam JSON format, then validates it with zod.
// userContent is a string, or an array of { type: "text" } / { type: "image_url" } parts.
// Returns { result, usage: { inputTokens, outputTokens }, model }
async function askForJson(systemPrompt, userContent) {
  if (MOCK) return mockResponse(userContent);

  let lastError;
  // Try twice: if the model ever returns something that fails validation, ask once more
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await getClient().chat.completions.create({
      model: MODEL,
      temperature: 0, // same input -> same verdict (SCRUM-17 acceptance criterion)
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "scam_analysis", strict: true, schema: scamResultJsonSchema },
      },
    });

    const message = response.choices[0].message;
    if (message.refusal) {
      throw new Error(`Model refused: ${message.refusal}`);
    }

    let raw;
    try {
      raw = JSON.parse(message.content);
    } catch (e) {
      lastError = new Error("AI reply was not valid JSON");
      continue;
    }

    const parsed = parseScamResult(raw); // zod check: never trust an outside service blindly
    if (parsed.ok) {
      return {
        result: parsed.data,
        usage: {
          inputTokens: response.usage ? response.usage.prompt_tokens : 0,
          outputTokens: response.usage ? response.usage.completion_tokens : 0,
        },
        model: MODEL,
      };
    }
    lastError = new Error(`AI reply failed validation: ${parsed.error}`);
  }
  throw lastError;
}

// Speech-to-text with Whisper. Returns { transcript, model }
async function transcribeAudio(filePath) {
  if (MOCK) {
    return {
      transcript: "Ma, it's me. I lost my phone and I'm in trouble. I need you to transfer $2,000 now. Don't tell Dad.",
      model: "mock",
    };
  }
  const transcription = await getClient().audio.transcriptions.create({
    file: fs.createReadStream(filePath),
    model: TRANSCRIBE_MODEL,
  });
  return { transcript: transcription.text, model: TRANSCRIBE_MODEL };
}

// Image part from a file on disk (used by the spike runner)
function imagePartFromFile(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return imagePartFromBuffer(fs.readFileSync(filePath), mime);
}

// Image part from an uploaded file in memory (used by POST /api/checks)
function imagePartFromBuffer(buffer, mimeType) {
  return { type: "image_url", image_url: { url: `data:${mimeType};base64,${buffer.toString("base64")}` } };
}

// ---------- Mock mode: predictable fake answers so the pipeline can be tested ----------
function mockResponse(userContent) {
  const text = (typeof userContent === "string"
    ? userContent
    : userContent.filter((p) => p.type === "text").map((p) => p.text).join(" ")
  ).toLowerCase();

  const scammy = /(transfer|urgent|don't tell|secret|otp|safe account|before 5pm|lost my phone|suspended|pay now)/.test(text);
  const result = scammy
    ? {
        level: "likely_scam",
        confidence: 0.9,
        claimed_identity: "mock sender",
        requested_action: "mock: send money",
        tricks: [{ name: "Urgency", quote: "mock quote" }],
        extracted: { links: [], phone_numbers: [], bank_accounts: [] },
        scam_type: "ai_phishing_message",
        ai_indicators: { public_figure_endorsement: false, claims_known_person: false, personal_details_used: false, ai_generated_signs: ["Mock mode - no real AI analysis"] },
        safe_actions: ["Do not transfer any money", "Call OCBC on the number on the back of your card"],
      }
    : {
        level: "no_common_signs",
        confidence: 0.8,
        claimed_identity: "",
        requested_action: "",
        tricks: [],
        extracted: { links: [], phone_numbers: [], bank_accounts: [] },
        scam_type: "none",
        ai_indicators: { public_figure_endorsement: false, claims_known_person: false, personal_details_used: false, ai_generated_signs: [] },
        safe_actions: ["Check again if they later ask for money or codes"],
      };
  return { result, usage: { inputTokens: 0, outputTokens: 0 }, model: "mock" };
}

module.exports = {
  askForJson,
  transcribeAudio,
  imagePartFromFile,
  imagePartFromBuffer,
  AiNotConfiguredError,
  MODEL,
  TRANSCRIBE_MODEL,
  MOCK,
};
