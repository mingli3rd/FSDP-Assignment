# SpellBreak

**FSDP Assignment, Group C31: Preventing AI-powered scams (OCBC challenge)**

SpellBreak helps working adults (30–49) recognise, verify and respond to AI-powered scams, such as deepfake video calls, cloned voices, AI-written phishing messages and AI-made images, **before money or sensitive information is lost**.

It is a prototype: every person, account, message and payment in it is synthetic. No real customer data is used.

---

## Features

Status: **Live** = runs on the backend and database. **Prototype** = working screens with built-in sample data; the backend for it is planned for Sprint 2.

### SpellBreak platform (http://localhost:3000)

| Feature | What it does | Status |
|---|---|---|
| Register and log in | Customer and staff accounts, JWT in an HTTP-only cookie, passwords hashed with bcrypt | Live |
| Quick Scam Check: text, link or screenshot | A multi-agent AI (text agent + image agent) checks the content and returns one of three results: **Likely scam**, **Some scam signs** or **No common scam signs** (never "Safe"), with the tricks it found, AI signs and safe next steps. Red flags are underlined in the message. | Live (when logged in as a customer) |
| Privacy protection | Card numbers, NRIC/FIN numbers and OTPs are masked **before** anything is sent to the AI. Content is wrapped so instructions hidden inside a scam can't take over the AI. Only masked text is saved; uploaded images are not stored. | Live |
| Check history | Every check is saved to the `ContentChecks` table (`GET /api/checks/mine`) | Live |
| Quick Scam Check: voice or video | Deepfake video-call demo: a fake "boss" asks for an urgent S$4,800 payment. Shows the face, voice and text agents running, then flagged moments, voice signs and the scam tricks. | Prototype |
| Call Context Check | 4 quick taps about a suspicious call, matched against known AI-scam patterns | Prototype |
| Verify with OCBC | One-time code a real OCBC officer can read back, safe call-back channels, and "verify the requester" for boss or family money requests | Prototype |
| Chat with Ollie | Ollie, the owl mascot, answers scam questions | Prototype |
| Reports | Choose what evidence to include, send the case to OCBC, or download a case summary for a police report | Live |
| Extension settings | Choose which features are on and how many warning signs trigger a Smart Pause | Prototype |
| Employee Triage Dashboard | Staff view of reported cases sorted by risk and amount, with case details and actions | Live |

### Mobile banking demo (http://localhost:4000)

A simulated OCBC-style banking app with SpellBreak built in. On a desktop, the list beside the phone jumps to any screen.

| Flow | Screens |
|---|---|
| Set up | E1: turn on SpellBreak and pick features |
| Deepfake boss on a video call | E2 urgent transfer → E3 **Smart Pause** pop-up → E4 verify the call recording → E5 deepfake scan result |
| QR payment check | E6 "What are you paying for?" → E7 pause when a "government fine" QR pays a personal account |
| Login Code Guard | E8 |
| Statement Shield | E9–E10 |

All mobile screens are **Prototype**.

---

## Tech stack

| Part | Technology |
|---|---|
| Backend | Node.js, Express 5 (CommonJS), MVC structure (models / controllers / middlewares) |
| Database | Microsoft SQL Server via the `mssql` package |
| Auth | `bcrypt`, `jsonwebtoken` (HTTP-only cookie), `cookie-parser` |
| Validation | Joi (requests), Zod (AI replies) |
| File uploads | Multer (in memory, never saved to disk) |
| AI | OpenAI API: `gpt-4o-mini` for text and image analysis with structured JSON output; Whisper (`whisper-1`) for speech-to-text in the AI spike |
| Frontend | HTML, CSS and JavaScript (no framework), Figtree font |
| Tools | GitHub, Jira (Scrum), Figma |

---

## Prerequisites

- **Node.js 20 or newer** (the current LTS version is recommended). Check with `node -v`.
- **Microsoft SQL Server** 2019 or newer (the free Express or Developer edition is fine), with **SQL Server Management Studio (SSMS)**.
- **Git**
- **An OpenAI API key** for the live AI check. Without one, you can run in mock mode (see step 4).

---

## Installation and setup

### 1. Clone the repository

```bash
git clone https://github.com/mingli3rd/FSDP-Assignment.git
cd FSDP-Assignment/SpellBreak/backend
```

### 2. Install the packages

```bash
npm install
```

### 3. Set up SQL Server

1. **Allow SQL logins.** In SSMS, right-click the server → **Properties** → **Security** → choose **SQL Server and Windows Authentication mode**.
2. **Turn on TCP/IP.** Open **SQL Server Configuration Manager** → **SQL Server Network Configuration** → **Protocols** → enable **TCP/IP** (port 1433), then restart the SQL Server service.
3. **Create the database and a login.** Run this in a new SSMS query window (choose your own password):

   ```sql
   CREATE DATABASE FSDP;
   GO
   CREATE LOGIN FSDPuser WITH PASSWORD = 'your_sql_password', CHECK_EXPIRATION = OFF, CHECK_POLICY = OFF;
   GO
   USE FSDP;
   CREATE USER FSDPuser FOR LOGIN FSDPuser;
   ALTER ROLE db_owner ADD MEMBER FSDPuser;
   GO
   ```

4. **Create the tables.** Open and run `SpellBreak/database/schema.sql`, then `SpellBreak/database/seed.sql`.

   A fresh setup needs nothing else. If your FSDP database was made with an **older** `schema.sql` (before the AI check was added), also run `SpellBreak/database/migrations/scrum17_content_checks.sql` once. It adds the columns the AI check saves to.

   For the Employee Triage Dashboard:

   - If your FSDP database was made with a `schema.sql` from **before** the triage dashboard was added, run `SpellBreak/database/migrations/scrum25_triage_cases.sql` once. It adds the columns the dashboard uses to `Cases`. A fresh setup from the current `schema.sql` doesn't need it.
   - Run `SpellBreak/database/migrations/scrum25_triage_cases_seed.sql` to load the synthetic sample cases. It only inserts when the `Cases` table is empty.

### 4. Create the `.env` file

In `SpellBreak/backend`, copy `.env.example` to a new file named `.env`:

```bash
copy .env.example .env      # Windows
cp .env.example .env        # macOS / Linux
```

Then fill in your values:

| Variable | What to put |
|---|---|
| `DB_SERVER`, `DB_PORT`, `DB_DATABASE` | Usually `localhost`, `1433`, `FSDP` |
| `DB_USER`, `DB_PASSWORD` | The SQL login from step 3 |
| `JWT_SECRET` | Any long random string |
| `OPENAI_API_KEY` | Your OpenAI key |
| `AI_MOCK` | `true` to test without a key (fake but predictable AI answers) |

`.env` is in `.gitignore`. **Never commit it, and never share your API key** in code, screenshots or chats.

### 5. Create the demo accounts

```bash
npm run seed:demo
```

This creates the two demo logins below. It is safe to run again.

---

## How to run the app

From `SpellBreak/backend`:

```bash
npm run dev
```

This starts both servers and restarts them when you save a file:

| URL | What it is |
|---|---|
| http://localhost:3000 | SpellBreak platform and API |
| http://localhost:4000 | Mobile banking demo |
| http://localhost:3000/api/health | Health check; shows `"status": "ok"` when the database is connected |

Other commands:

| Command | What it does |
|---|---|
| `npm start` | Same servers without auto-restart |
| `npm run mobile` | The mobile demo on its own (the API must already be running on port 3000) |
| `npm run spike` | Runs the AI on the sample scam messages in `backend/spike/samples` and saves an accuracy report to `backend/spike/results` (needs an API key) |

If a page still looks old after an update, press **Ctrl + F5** to reload without the browser cache.

### Try it

1. Open http://localhost:3000/login.html and log in as the demo customer.
2. Go to **Quick Scam Check**, keep the sample SMS and click **Check with Spellbreak**. This runs the live AI.
3. Open the **Voice or video** tab to see the deepfake video-call demo (or go to http://localhost:3000/scam-check.html?mode=video).
4. Open http://localhost:4000 and follow **Deepfake boss on a video call** to see Smart Pause stop the payment.
5. Log out and log in as the demo staff account to see the Employee Triage Dashboard.

---

## Demo login credentials

Created by `npm run seed:demo`. These are synthetic accounts for testing only.

| Role | Email | Password | Opens |
|---|---|---|---|
| Customer | `alex.lim@spellbreak.test` | `Demo@1234` | Home page; can run live AI checks |
| OCBC staff | `nur.aisyah@spellbreak.test` | `Staff@1234` | Employee Triage Dashboard |

You can also make your own account on the **Register** page; new accounts are customers. To turn an account into a staff account, run in SSMS:

```sql
UPDATE Users SET role = 'employee' WHERE email = 'your_email@here';
```

---

## Project structure

```
SpellBreak/
├── backend/
│   ├── app.js              all API routes, grouped by section
│   ├── mobile-server.js    serves the mobile demo on port 4000
│   ├── dbConfig.js         reads the database settings from .env
│   ├── controllers/        request and response handling
│   ├── models/             all SQL queries (parameterised)
│   ├── middlewares/        auth, Joi validation, image upload
│   ├── services/ai/        multi-agent AI: agents, prompts, privacy masking, result format
│   ├── scripts/            seedDemoUsers.js
│   └── spike/              AI accuracy test (samples + results)
├── database/
│   ├── schema.sql          creates all tables
│   ├── seed.sql            synthetic scam scenarios
│   └── migrations/         updates for databases made with an older schema
├── frontend/               SpellBreak platform pages (HTML, css/, js/)
└── mobile/                 mobile banking demo
```

---

## Team members and roles

| Member | Scrum role | Main areas |
|---|---|---|
| Goh Yeong Jong | Product Owner | AI security agent, Risk Explainer and safe actions, platform and mobile frontend |
| Matthias Wong | Scrum Master | Wireframes, shared UI layout, SpellBreak layer in the banking site, QR payment check, Login Code Guard |
| Tan Ming Li | Developer | Verify path (message checks) and deepfake scanning, Smart Pause, chatbot |
| Yeo Kee Hern Heemus | Developer | System design and database schema, Report and Evidence Locker, Employee Triage Dashboard |
| Joel Tan | Developer | Synthetic scam dataset, mascot design, UX copy, testing and demo script |
