-- Synthetic reported cases for the Employee Triage Dashboard demo.
-- Run AFTER schema.sql (and scrum25_triage_cases.sql if your database predates it).
-- Only inserts when the Cases table is empty.
-- All people are fake. The seeded customers cannot log in (their password hash is
-- not a valid bcrypt hash), so they only exist to own the sample cases.

USE FSDP;
GO

IF NOT EXISTS (SELECT 1 FROM Cases)
BEGIN
    -- 1. Synthetic customers (skipped if the email already exists)
    INSERT INTO Users (name, email, password_hash, role)
    SELECT v.name, v.email, '!synthetic-no-login', 'customer'
    FROM (VALUES
        ('Alex Lim',     'alex.lim@synthetic.test'),
        ('Priya Nair',   'priya.nair@synthetic.test'),
        ('Marcus Ong',   'marcus.ong@synthetic.test'),
        ('Siti Rahman',  'siti.rahman@synthetic.test'),
        ('Daniel Koh',   'daniel.koh@synthetic.test'),
        ('Mei Ling',     'mei.ling@synthetic.test'),
        ('Hafiz Ali',    'hafiz.ali@synthetic.test')
    ) AS v(name, email)
    WHERE NOT EXISTS (SELECT 1 FROM Users u WHERE u.email = v.email);

    -- 2. Cases (priority follows the risk score: 80+ high, 50+ medium, else low)
    INSERT INTO Cases (reporter_id, status, priority, resolution, summary, risk_score, amount, amount_note,
                       scam_type, looks_like, source, evidence, signals, created_at, updated_at)
    SELECT u.id, c.status, c.priority, c.resolution, c.summary, c.risk, c.amount, c.amount_note,
           c.scam_type, c.looks_like, c.source, c.evidence, c.signals,
           DATEADD(MINUTE, -c.mins_ago, SYSDATETIME()), DATEADD(MINUTE, -c.mins_ago, SYSDATETIME())
    FROM (VALUES
        ('alex.lim@synthetic.test',    'new',       'high',   NULL,       'Customer cancelled a S$4,800 transfer for concert tickets.',
          91, 4800.00,  N'S$4,800 to new payee',  'E-commerce',    N'E-commerce scam',
          N'Extension, Smart Pause',
          N'"2 VIP tickets for Saturday, S$4,800. Many people waiting, pay now by PayNow..."',
          N'["Pressure","Pay first","AI-made photo"]', 14),
        ('priya.nair@synthetic.test',  'in_review', 'high',   NULL,       'Urgent vendor payment requested by a cloned boss voice.',
          89, 12000.00, N'S$12,000 to new payee', 'Impersonation', N'Voice-clone boss',
          N'Platform, Call Context Check',
          N'"It''s David. Board meeting, can''t talk. Process the vendor payment before 5pm, keep it between us."',
          N'["Urgency","Secrecy","Voice clone"]', 95),
        ('marcus.ong@synthetic.test',  'escalated', 'high',   NULL,       'Three transfers into a fake investment platform.',
          88, 20500.00, N'S$20,500 over 3 transfers', 'Investment', N'Deepfake investment ad',
          N'Extension, Smart Pause',
          N'"As seen with our CEO on video: guaranteed 30% monthly returns. Top up to unlock withdrawals."',
          N'["Too good to be true","Deepfake video","Top-up to withdraw"]', 180),
        ('siti.rahman@synthetic.test', 'new',       'high',   NULL,       'Customer asked to hand over a login code during a call.',
          86, NULL,     N'Account access',        'Login code',    N'Fake bank officer',
          N'Extension, Login Code Guard',
          N'Login attempt from a new device in another country while the customer was on a call with "OCBC".',
          N'["Asked for OTP","New device","Overseas login"]', 32),
        ('daniel.koh@synthetic.test',  'new',       'medium', NULL,       'Phishing SMS asking for a redelivery fee.',
          67, 420.00,   N'S$420',                 'Phishing',      N'AI-written phishing SMS',
          N'Platform, Quick Scam Check',
          N'"Your parcel is on hold. Pay S$4.20 redelivery fee at sg-post-track.co within 24 hours."',
          N'["Fake link","Urgency"]', 55),
        ('mei.ling@synthetic.test',    'new',       'medium', NULL,       'Task-based job scam asking for a top-up before payout.',
          61, 300.00,   N'S$300 top-up',          'Job scam',      N'Task-based job scam',
          N'Platform, Chat with Ollie',
          N'"Complete 10 more tasks to unlock your S$480 commission. Top up S$300 first."',
          N'["Pay to work","Small payout first"]', 240),
        ('hafiz.ali@synthetic.test',   'closed',    'low',    'released', 'QR paid to a personal account; customer confirmed it was the stall owner.',
          32, 0.00,     N'S$0',                   'QR payment',    N'QR mismatch, resolved',
          N'Extension, QR payment check',
          N'Hawker QR paid to a personal account. Customer confirmed the stall owner''s own account.',
          N'["Account type mismatch"]', 600)
    ) AS c(email, status, priority, resolution, summary, risk, amount, amount_note, scam_type, looks_like, source, evidence, signals, mins_ago)
    JOIN Users u ON u.email = c.email;

    -- 3. Audit trail: every case starts with a 'created' event from the customer
    INSERT INTO CaseEvents (case_id, actor_user_id, event_type, details, created_at)
    SELECT id, reporter_id, 'created', N'{"action":"report","note":"Customer sent this case to OCBC"}', created_at
    FROM Cases;

    -- 4. History for the three cases that already moved on (no staff account, so actor is NULL)
    INSERT INTO CaseEvents (case_id, actor_user_id, event_type, details, created_at)
    SELECT c.id, NULL, e.event_type, e.details, DATEADD(MINUTE, e.after_min, c.created_at)
    FROM Cases c
    JOIN (VALUES
        ('Voice-clone boss',        'status_change', N'{"action":"contact","from":"new","to":"in_review","note":"Called the customer. Payment not sent yet."}', 8),
        ('Deepfake investment ad',  'status_change', N'{"action":"contact","from":"new","to":"in_review"}', 10),
        ('Deepfake investment ad',  'escalated',     N'{"action":"escalate","from":"in_review","to":"escalated","note":"Three transfers already sent. Needs a recovery request."}', 30),
        ('QR mismatch, resolved',   'status_change', N'{"action":"release","from":"new","to":"closed","note":"Customer confirmed the stall owner account."}', 20)
    ) AS e(looks_like, event_type, details, after_min) ON e.looks_like = c.looks_like;
END
GO
