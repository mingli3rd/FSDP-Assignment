// SCRUM-40 AI spike runner.
// Runs every sample case through the agents, checks the JSON format,
// scores the verdicts against the expected answers, and records time,
// tokens and estimated cost. Results are saved to spike/results/.
//
// Run from the backend folder:
//   npm run spike                 (real AI, needs OPENAI_API_KEY in .env)
//   npm run spike -- --mock       (fake AI, tests the code path for free)
//   npm run spike -- --only T1,T3 (run selected cases)

const path = require("path");
const fs = require("fs");

try {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
} catch (e) {
  // dotenv not installed - fine in mock mode
}
if (process.argv.includes("--mock")) process.env.AI_MOCK = "true";

const agents = require("../services/ai/agents");
const { isValidResult } = require("../services/ai/scamSchema");
const { MODEL, TRANSCRIBE_MODEL, MOCK } = require("../services/ai/openaiClient");

// Prices in USD - CHECK openai.com/api/pricing before the Sprint Review,
// these change. Per 1 million tokens / per minute of audio.
const PRICES = {
  inputPer1M: 0.15,
  outputPer1M: 0.6,
  transcribePerMinute: 0.006,
  assumedAudioMinutes: 0.5, // per voice sample; update to your real clip length
};

const SAMPLES_DIR = path.join(__dirname, "samples");
const RESULTS_DIR = path.join(__dirname, "results");

function loadCases() {
  const manifest = JSON.parse(fs.readFileSync(path.join(SAMPLES_DIR, "manifest.json"), "utf8"));
  const onlyArg = process.argv.find((a) => a.startsWith("--only"));
  const onlyIds = onlyArg ? (onlyArg.split("=")[1] || process.argv[process.argv.indexOf(onlyArg) + 1] || "").split(",") : null;
  return manifest.cases.filter((c) => !onlyIds || onlyIds.includes(c.id));
}

function toInput(c) {
  const filePath = c.file ? path.join(SAMPLES_DIR, c.file) : null;
  if (filePath && !fs.existsSync(filePath)) return { skip: `file not found: ${c.file}` };

  if (c.kind === "text") return { text: c.text };
  if (c.kind === "image") return { imagePaths: [filePath], note: c.note };
  if (c.kind === "voice") return { audioPath: filePath };
  if (c.kind === "multi") return { text: c.text, imagePaths: [filePath], note: c.note };
  return { skip: `unknown kind: ${c.kind}` };
}

function sumUsage(output) {
  const all = [...output.findings.map((f) => f.usage)];
  if (output.explainerUsage) all.push(output.explainerUsage);
  return all.reduce(
    (t, u) => ({ inputTokens: t.inputTokens + u.inputTokens, outputTokens: t.outputTokens + u.outputTokens }),
    { inputTokens: 0, outputTokens: 0 }
  );
}

function estimateCost(usage, audioClips) {
  return (
    (usage.inputTokens / 1e6) * PRICES.inputPer1M +
    (usage.outputTokens / 1e6) * PRICES.outputPer1M +
    audioClips * PRICES.assumedAudioMinutes * PRICES.transcribePerMinute
  );
}

async function main() {
  const cases = loadCases();
  console.log(`\nSpellBreak AI spike - model: ${MOCK ? "MOCK" : MODEL}, transcription: ${MOCK ? "MOCK" : TRANSCRIBE_MODEL}`);
  console.log(`Running ${cases.length} case(s)...\n`);

  const rows = [];

  for (const c of cases) {
    const input = toInput(c);
    if (input.skip) {
      console.log(`- ${c.id} SKIPPED (${input.skip})`);
      rows.push({ id: c.id, kind: c.kind, skipped: input.skip });
      continue;
    }

    const started = Date.now();
    try {
      const output = await agents.analyze(input);
      const ms = Date.now() - started;
      const usage = sumUsage(output);
      const audioClips = input.audioPath ? 1 : 0;
      const formatOk = isValidResult(output.final) && output.findings.every((f) => isValidResult(f.result));
      const correct = output.final.verdict === c.expected;

      console.log(
        `${correct ? "✔" : "✘"} ${c.id} [${c.kind}] expected=${c.expected} got=${output.final.verdict} ` +
          `(${Math.round(output.final.confidence * 100)}%) type=${output.final.scam_type} ` +
          `format=${formatOk ? "ok" : "BAD"} ${ms}ms`
      );

      rows.push({
        id: c.id,
        kind: c.kind,
        expected: c.expected,
        got: output.final.verdict,
        correct,
        formatOk,
        ms,
        usage,
        costUsd: estimateCost(usage, audioClips),
        transcript: output.findings.find((f) => f.transcript)?.transcript,
        final: output.final,
        findings: output.findings.map((f) => ({ agent: f.agent, result: f.result })),
      });
    } catch (error) {
      console.log(`✘ ${c.id} ERROR: ${error.message}`);
      rows.push({ id: c.id, kind: c.kind, error: error.message, ms: Date.now() - started });
    }
  }

  // ---- Summary ----
  const ran = rows.filter((r) => !r.skipped && !r.error);
  const correct = ran.filter((r) => r.correct).length;
  const formatOk = ran.filter((r) => r.formatOk).length;
  const totalCost = ran.reduce((t, r) => t + r.costUsd, 0);
  const avgMs = ran.length ? Math.round(ran.reduce((t, r) => t + r.ms, 0) / ran.length) : 0;

  const summary = {
    ranAt: new Date().toISOString(),
    model: MOCK ? "mock" : MODEL,
    transcribeModel: MOCK ? "mock" : TRANSCRIBE_MODEL,
    cases: cases.length,
    ran: ran.length,
    skipped: rows.filter((r) => r.skipped).length,
    errors: rows.filter((r) => r.error).length,
    accuracy: ran.length ? `${correct}/${ran.length}` : "n/a",
    jsonFormatValid: ran.length ? `${formatOk}/${ran.length}` : "n/a",
    avgResponseMs: avgMs,
    totalCostUsd: Number(totalCost.toFixed(5)),
    costPerCheckUsd: ran.length ? Number((totalCost / ran.length).toFixed(5)) : 0,
    pricesUsed: PRICES,
  };

  console.log("\n===== SUMMARY =====");
  console.table({
    Accuracy: summary.accuracy,
    "JSON format valid": summary.jsonFormatValid,
    Skipped: summary.skipped,
    Errors: summary.errors,
    "Avg response (ms)": summary.avgResponseMs,
    "Total cost (USD)": summary.totalCostUsd,
    "Cost per check (USD)": summary.costPerCheckUsd,
  });

  if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = path.join(RESULTS_DIR, `spike-${MOCK ? "mock-" : ""}${stamp}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ summary, rows }, null, 2));
  console.log(`\nFull results saved to ${path.relative(process.cwd(), outFile)}`);
}

main().catch((error) => {
  console.error("Spike failed:", error.message);
  process.exit(1);
});
