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
const { scamResultSchema } = require("./scamSchema");

const MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const TRANSCRIBE_MODEL = process.env.AI_TRANSCRIBE_MODEL || "whisper-1";
const MOCK = process.env.AI_MOCK === "true";

let client = null;

function getClient() {
  if (client) return client;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing. Add it to backend/.env (or set AI_MOCK=true to test without a key).");
  }
  const OpenAI = require("openai"); // loaded only when needed, so mock mode works without it
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

// Sends a system prompt + user content and forces the reply into the fixed
// scam JSON format. userContent is either a string or an array of
// { type: "text" } / { type: "image_url" } parts (for images).
// Returns { result, usage: { inputTokens, outputTokens }, model }
async function askForJson(systemPrompt, userContent) {
  if (MOCK) return mockResponse(userContent);

  const response = await getClient().chat.completions.create({
    model: MODEL,
    temperature: 0.2, // low = more consistent verdicts
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "scam_analysis", strict: true, schema: scamResultSchema },
    },
  });

  const message = response.choices[0].message;
  if (message.refusal) {
    throw new Error(`Model refused: ${message.refusal}`);
  }

  return {
    result: JSON.parse(message.content),
    usage: {
      inputTokens: response.usage ? response.usage.prompt_tokens : 0,
      outputTokens: response.usage ? response.usage.completion_tokens : 0,
    },
    model: MODEL,
  };
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

// Builds an image part for askForJson from a file on disk
function imagePartFromFile(filePath) {
  const ext = filePath.split(".").pop().toLowerCase();
  const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const base64 = fs.readFileSync(filePath).toString("base64");
  return { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } };
}

// ---- Mock mode: predictable fake answers so the pipeline can be tested ----
function mockResponse(userContent) {
  const text = (typeof userContent === "string"
    ? userContent
    : userContent.filter((p) => p.type === "text").map((p) => p.text).join(" ")
  ).toLowerCase();

  const scammy = /(transfer|urgent|don't tell|secret|otp|safe account|before 5pm|lost my phone|compromised|\"verdict\": ?\"scam\")/.test(text);
  const result = scammy
    ? {
        verdict: "scam",
        confidence: 0.9,
        tricks: ["Urgency: asks for money right now", "Secrecy: asks you not to tell anyone"],
        ai_generated_signs: ["Mock mode - no real AI analysis"],
        scam_type: "voice_clone_family",
        safe_actions: ["Do not transfer any money", "Call the person on the number saved in your phone"],
      }
    : {
        verdict: "safe",
        confidence: 0.8,
        tricks: [],
        ai_generated_signs: [],
        scam_type: "none",
        safe_actions: ["No action needed"],
      };
  return { result, usage: { inputTokens: 0, outputTokens: 0 }, model: "mock" };
}

module.exports = {
  askForJson,
  transcribeAudio,
  imagePartFromFile,
  MODEL,
  TRANSCRIBE_MODEL,
  MOCK,
};
