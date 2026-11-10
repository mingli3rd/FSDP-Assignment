# SCRUM-40 AI Spike — Results

**Owner:** Goh Yeong Jong · **Sprint:** 1 · **Date:** _fill in_

## 1. Agent plan (agreed)

| Agent | Input | How it works |
|---|---|---|
| Text agent | SMS / WhatsApp / email / transcript | LLM checks for scam tricks and AI-written signs |
| Image agent | Screenshot, photo, QR, video key frame | Vision LLM reads text in the image and looks for AI-generation artefacts |
| Voice/video agent | Voice note / call recording (video: key frames → image agent) | Whisper transcribes → LLM analyses the transcript |
| Explainer agent | Findings from the agents above | Combines them into one verdict + safe actions |
| Chatbot agent | — | Later sprint |

All agents return the same fixed JSON format:
`verdict`, `confidence`, `tricks`, `ai_generated_signs`, `scam_type`, `safe_actions`
(enforced with OpenAI structured outputs, see `services/ai/scamSchema.js`).

## 2. Setup

- Provider: OpenAI, called from Node.js (`services/ai/openaiClient.js`)
- Chat + vision model: _fill in, e.g. gpt-4o-mini_
- Transcription model: _fill in, e.g. whisper-1_
- API key stored in `backend/.env` as `OPENAI_API_KEY` (not committed)

## 3. Results

_Paste the SUMMARY table from `npm run spike` here._

| Metric | Result |
|---|---|
| Accuracy (verdict matched expected) | /  |
| JSON format valid | / |
| Average response time | ms |
| Cost per check | USD |

**Cases it got wrong and why:**
- _e.g. T5 HR bank-details message: expected suspicious, got scam — prompt is a bit strict_

**Whisper test (V1):** _paste the transcript and whether it was accurate_

## 4. Cost estimate for the demo

- Cost per check: ~$___
- 200 checks during development + demo ≈ $___

## 5. Limits found

- Voice agent only judges the **words** (transcript). It cannot tell if a voice is synthetic from the sound itself; a dedicated audio deepfake detector would be needed for that.
- Image agent can miss high-quality deepfakes; vision LLMs are not trained deepfake detectors.
- Video is handled as key frames only (needs ffmpeg to extract frames — not built yet).
- Responses take a few seconds, so the UI needs a loading state.
- Results can vary slightly between runs; temperature is set low (0.2) to reduce this.

## 6. Recommendation

_e.g. Go ahead with this setup for Sprint 1. Next: wire `agents.analyze()` into the Context Checker API (POST /api/checks)._
