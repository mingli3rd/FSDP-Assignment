-- SpellBreak database schema (MSSQL)
-- Run in SSMS. Creates all SpellBreak tables inside the FSDP database.

USE FSDP;
GO

-- Customers and OCBC employees (simulated accounts only, no real customer data)
CREATE TABLE Users (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    role           VARCHAR(20)  NOT NULL CHECK (role IN ('customer', 'employee')),
    created_at     DATETIME2    NOT NULL DEFAULT SYSDATETIME()
);

-- Synthetic scam and legitimate scenarios (AI voice + deepfake only)
CREATE TABLE Scenarios (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    title               VARCHAR(150) NOT NULL,
    channel             VARCHAR(20)  NOT NULL CHECK (channel IN ('voice_call', 'voice_note', 'video_call', 'video')),
    is_scam             BIT          NOT NULL,
    impersonated_party  VARCHAR(100) NULL,      -- e.g. 'OCBC staff', 'family member', 'boss'
    scam_type           VARCHAR(50)  NULL,      -- e.g. 'voice_clone_family', 'deepfake_executive'
    transcript          NVARCHAR(MAX) NULL,
    media_url           VARCHAR(500) NULL,
    created_at          DATETIME2    NOT NULL DEFAULT SYSDATETIME()
);

-- Each time a user checks a suspicious call / clip (Context Checker + Risk Explainer)
CREATE TABLE ContentChecks (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    user_id      INT NOT NULL REFERENCES Users(id),
    scenario_id  INT NULL REFERENCES Scenarios(id),
    media_type   VARCHAR(10)  NOT NULL CHECK (media_type IN ('text', 'image', 'audio', 'video')),
    media_url    VARCHAR(500) NULL,
    transcript   NVARCHAR(MAX) NULL,
    ai_score     DECIMAL(5,2) NULL,             -- 0-100: AI confidence in the risk level
    risk_level   VARCHAR(10)  NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    signals      NVARCHAR(MAX) NULL,            -- JSON: tricks (with quotes), extracted links/numbers, AI indicators
    explanation  NVARCHAR(MAX) NULL,            -- JSON: claimed identity, requested action, safe actions
    scam_type    VARCHAR(50)  NULL,             -- matches SCAM_TYPES in services/ai/scamSchema.js
    source       VARCHAR(30)  NULL,             -- where the customer got it, e.g. SMS, WhatsApp
    created_at   DATETIME2    NOT NULL DEFAULT SYSDATETIME()
);

-- Simulated bank transfers (where Smart Pause steps in)
CREATE TABLE Transfers (
    id               INT IDENTITY(1,1) PRIMARY KEY,
    user_id          INT NOT NULL REFERENCES Users(id),
    payee_name       VARCHAR(100)  NOT NULL,
    payee_account    VARCHAR(50)   NOT NULL,    -- fake account numbers only
    amount           DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    status           VARCHAR(20)   NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'paused', 'completed', 'cancelled')),
    linked_check_id  INT NULL REFERENCES ContentChecks(id),
    created_at       DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);

-- Smart Pause: every time a transfer is interrupted, and what the user did
CREATE TABLE PauseEvents (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    transfer_id     INT NOT NULL REFERENCES Transfers(id),
    trigger_reason  VARCHAR(255) NOT NULL,
    user_action     VARCHAR(20)  NULL CHECK (user_action IN ('verified', 'cancelled', 'proceeded', 'reported')),
    paused_at       DATETIME2    NOT NULL DEFAULT SYSDATETIME(),
    resolved_at     DATETIME2    NULL
);

-- Official verification journey (call back via official channel)
CREATE TABLE Verifications (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    user_id        INT NOT NULL REFERENCES Users(id),
    check_id       INT NULL REFERENCES ContentChecks(id),
    claimed_party  VARCHAR(100) NOT NULL,
    method         VARCHAR(20)  NOT NULL CHECK (method IN ('official_hotline', 'in_app_message', 'branch')),
    outcome        VARCHAR(20)  NULL CHECK (outcome IN ('confirmed_legit', 'confirmed_scam', 'unreachable')),
    created_at     DATETIME2    NOT NULL DEFAULT SYSDATETIME()
);

-- Reported cases for the Employee Triage Dashboard
CREATE TABLE Cases (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    reporter_id  INT NOT NULL REFERENCES Users(id),
    assigned_to  INT NULL REFERENCES Users(id),       -- employee handling the case
    check_id     INT NULL REFERENCES ContentChecks(id),
    transfer_id  INT NULL REFERENCES Transfers(id),
    status       VARCHAR(20) NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new', 'in_review', 'escalated', 'closed')),
    priority     VARCHAR(10) NOT NULL DEFAULT 'medium'
                 CHECK (priority IN ('low', 'medium', 'high')),
    summary      NVARCHAR(MAX) NULL,
    created_at   DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at   DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

-- Evidence + escalation audit trail for each case
CREATE TABLE CaseEvents (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    case_id        INT NOT NULL REFERENCES Cases(id),
    actor_user_id  INT NULL REFERENCES Users(id),
    event_type     VARCHAR(20) NOT NULL
                   CHECK (event_type IN ('created', 'note', 'status_change', 'evidence_added', 'escalated')),
    details        NVARCHAR(MAX) NULL,
    created_at     DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO
