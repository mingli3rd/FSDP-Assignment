// The four agents from the SCRUM-40 agent plan:
//   text agent   -> messages / transcripts
//   image agent  -> screenshots, photos, video key frames (vision)
//   voice agent  -> voice notes / calls: Whisper transcript, then analysis
//   explainer    -> combines the findings into one final answer
// (chatbot agent comes later)

const ai = require("./openaiClient");
const prompts = require("./prompts");

async function textAgent(text) {
  const reply = await ai.askForJson(prompts.TEXT_AGENT, `Message to check:\n"""${text}"""`);
  return { agent: "text", ...reply };
}

// filePath: image on disk. note: optional context from the user ("my son sent this")
async function imageAgent(filePath, note) {
  const userContent = [
    { type: "text", text: note ? `Customer's note: ${note}` : "Check this image." },
    ai.imagePartFromFile(filePath),
  ];
  const reply = await ai.askForJson(prompts.IMAGE_AGENT, userContent);
  return { agent: "image", ...reply };
}

async function voiceAgent(filePath) {
  const { transcript, model: transcribeModel } = await ai.transcribeAudio(filePath);
  const reply = await ai.askForJson(prompts.VOICE_AGENT, `Call / voice note transcript:\n"""${transcript}"""`);
  return { agent: "voice", transcript, transcribeModel, ...reply };
}

// findings: array of agent outputs from above
async function explainerAgent(findings) {
  const summary = findings.map((f) => ({ agent: f.agent, findings: f.result }));
  const reply = await ai.askForJson(
    prompts.EXPLAINER_AGENT,
    `Agent findings for one situation:\n${JSON.stringify(summary, null, 2)}`
  );
  return { agent: "explainer", ...reply };
}

// Runs whichever agents apply in parallel, then the explainer.
// input: { text?, imagePaths?: [], audioPath?, note? }
async function analyze(input) {
  const jobs = [];
  if (input.text) jobs.push(textAgent(input.text));
  (input.imagePaths || []).forEach((p) => jobs.push(imageAgent(p, input.note)));
  if (input.audioPath) jobs.push(voiceAgent(input.audioPath));

  if (jobs.length === 0) {
    throw new Error("Nothing to analyse - provide text, an image or an audio file.");
  }

  const findings = await Promise.all(jobs);

  // With only one agent there is nothing to combine, so skip the extra call
  const final = findings.length === 1 ? findings[0] : await explainerAgent(findings);

  return { final: final.result, findings, explainerUsed: findings.length > 1, explainerUsage: findings.length > 1 ? final.usage : null };
}

module.exports = {
  textAgent,
  imageAgent,
  voiceAgent,
  explainerAgent,
  analyze,
};
