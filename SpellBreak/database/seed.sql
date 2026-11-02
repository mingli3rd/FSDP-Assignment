-- Sample data so the team has something to test with.
-- All synthetic: fake people, fake accounts, no real customer data.
-- Run AFTER schema.sql. 
USE FSDP;
GO

-- Test accounts are NOT inserted here, because passwords must be bcrypt-hashed.
-- Create them through the website's Register page (or POST /api/auth/register).
-- To make an employee account, register normally, then run:
--   UPDATE Users SET role = 'employee' WHERE email = 'your_email@here';

-- Synthetic AI-voice / deepfake scenarios (Joel can expand this list)
INSERT INTO Scenarios (title, channel, is_scam, impersonated_party, scam_type, transcript) VALUES
('Cloned voice of son asking for urgent money', 'voice_call', 1, 'family member', 'voice_clone_family',
 'Ma, it''s me. I got into an accident and I need $3,000 now. Please don''t tell Dad, just transfer to my friend''s account.'),
('Deepfake video call from "CEO" requesting payment', 'video_call', 1, 'boss', 'deepfake_executive',
 'This is confidential. I need you to process a $25,000 vendor payment before 5pm. Don''t loop in finance, I''ll explain later.'),
('AI voice posing as OCBC fraud officer', 'voice_call', 1, 'OCBC staff', 'voice_clone_bank',
 'This is OCBC fraud department. Your account is compromised. Move your savings to this safe account immediately.'),
('Real call from daughter about dinner plans', 'voice_call', 0, NULL, NULL,
 'Hi Dad, I''ll be home late tonight, can you save some dinner for me?');
GO
