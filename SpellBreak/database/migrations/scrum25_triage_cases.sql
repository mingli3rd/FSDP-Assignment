-- SCRUM-25/26/27: give Cases the columns the Employee Triage Dashboard needs.
-- Run ONCE in SSMS on your FSDP database (teammates who set up from the new
-- schema.sql don't need this - it already has these changes).
-- Safe to run more than once. Nothing existing is dropped or renamed.
--
-- How the existing columns are used:
--   Cases.status       new | in_review | escalated | closed
--   Cases.resolution   (new) released | scam. Only set when status = 'closed'
--   CaseEvents         the audit trail. event_type is one of the 5 allowed values:
--                        created        customer sent the report
--                        status_change  contacted / marked scam / released
--                        escalated      escalated to a senior reviewer
--                        note           free-text note (no status change)
--                      details holds JSON: {"action":"release","from":"new","to":"closed","note":"..."}

USE FSDP;
GO

IF COL_LENGTH('Cases', 'risk_score') IS NULL
BEGIN
    ALTER TABLE Cases ADD
        risk_score   INT           NULL CONSTRAINT CK_Cases_risk_score CHECK (risk_score BETWEEN 0 AND 100),
        amount       DECIMAL(12,2) NULL CONSTRAINT CK_Cases_amount CHECK (amount >= 0),
        amount_note  NVARCHAR(150) NULL,           -- e.g. 'S$4,800 to new payee'
        scam_type    VARCHAR(50)   NULL,           -- e.g. 'E-commerce', 'Phishing', 'Impersonation'
        looks_like   NVARCHAR(150) NULL,           -- e.g. 'Voice-clone boss'
        source       NVARCHAR(100) NULL,           -- e.g. 'Extension, Smart Pause'
        evidence     NVARCHAR(MAX) NULL,           -- what the customer chose to submit
        signals      NVARCHAR(MAX) NULL,           -- JSON array of red flags, e.g. ["Urgency","Secrecy"]
        resolution   VARCHAR(20)   NULL CONSTRAINT CK_Cases_resolution CHECK (resolution IN ('released', 'scam'));
END
GO

-- The dashboard lists open cases by risk, and the audit trail by case + time
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Cases_status_risk' AND object_id = OBJECT_ID('Cases'))
    CREATE INDEX IX_Cases_status_risk ON Cases (status, risk_score DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CaseEvents_case_time' AND object_id = OBJECT_ID('CaseEvents'))
    CREATE INDEX IX_CaseEvents_case_time ON CaseEvents (case_id, created_at);
GO
