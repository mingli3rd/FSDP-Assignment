# SpellBreak – project context for Claude

## What this is
SpellBreak is a Full Stack Development Project (FSDP) prototype by a team of 5 students at Ngee Ann Polytechnic, built for the OCBC Innovation Challenge, Problem Statement 3: "Digital Trust: Protecting Customers from AI-Powered Scams".

Problem statement: How might OCBC create a useful moment of friction when acting too quickly could cause customer harm?

## Core rule
Every feature must target **AI-powered scams** (deepfake voice/video, AI-written messages, AI-generated images). Not generic scams.

## Users
- Customers: working adults aged 30–49
- OCBC staff: Trust Desk employees who triage reported cases

## Features
1. **Message / image check** – customer pastes a suspicious message or uploads an image; AI flags warning signals
2. **Friction point 1: suspicious transfer** – pause-and-verify interrupt before a risky transfer goes through
3. **Friction point 2: login code request** – warning when someone asks the customer for a login code / OTP
4. **Official verification** – guides the customer to verify through an official OCBC channel
5. **Trust Desk (staff side)** – case queue, triage, evidence log, escalation

## Tech stack
- Front end: website (plain HTML, CSS, JavaScript) – not a mobile app
- Back end: Node.js + Express
- Database: Microsoft SQL Server (MSSQL) via the `mssql` package
- AI: text + image scam analysis

## Folder map (same MVC style as our previous BED project)
- `backend/app.js` – Express app; all routes are declared here, grouped by feature with `// --- Feature ---` comments
- `backend/controllers/<feature>Controller.js` → `backend/models/<feature>Model.js` (MSSQL via `dbConfig.js`)
- `backend/middlewares/` – Joi validation (`<feature>Validation.js`) and `authMiddleware.js` (JWT in cookie)
- `backend/services/ai/` – AI scam analysis; `backend/services/riskService.js` – decides when to add friction
- `backend/config/upload.js` – multer for evidence screenshots → `backend/uploads/evidence/`
- `backend/test/controller`, `backend/test/model` – Jest tests
- `frontend/` – one `.html` per page, with matching `js/<page>.js`; shared `css/main.css` and `js/main.js`
- `database/schema.sql`, `database/seed.sql` – synthetic data only

Features map to files as: messageCheck, transfer (friction 1), codeRequest (friction 2), verification, case (Trust Desk), auth.

## Code style (follow existing files)
- CommonJS (`require` / `module.exports`), Express 5
- Models: `const connection = await sql.connect(dbConfig)`, `request.input(...)` for every value, try/catch with `console.error("Database error:", error)`
- Validation: Joi schema + middleware function returning `400 { error }`
- Errors to the client as `{ error: "message" }`

## Rules
- Synthetic data only. No real customer data, no real biometrics.
- Never block a legitimate transaction without review – friction, not hard blocks.
- Secrets go in `.env` (never committed). Use parameterised SQL queries.
- We are students learning: explain changes briefly and keep code readable over clever.

## Process
Scrum on Jira, 2-week sprints. Working prototype due by end of Sprint 2.
ASG1 submission: 19 Nov 2026 12pm. ByteHacks pitch: 20 Nov 2026.
