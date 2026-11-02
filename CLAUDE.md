

Project: SpellBreak, an FSDP school prototype for the OCBC challenge. It helps working adults (30-49) recognise, verify and respond to AI voice-clone and deepfake scams before money is lost. Only AI-powered scams (voice clones, deepfakes) are in scope. Only synthetic data, no real customer data.

Stack: Node.js + Express 5 (CommonJS), MSSQL via the mssql package, plain HTML/CSS/JS frontend served by Express from SpellBreak/frontend. Database name is FSDP. Schema is in SpellBreak/database/schema.sql.

Follow the format of my previous BED project at C:\Users\propa\Downloads\BED-FINAL\BED2026Apr_Assignment_P02_Team05:
- MVC: models/ (all SQL, always use request.input() parameters), controllers/ (req/res only, no SQL), middlewares/ (one Joi <feature>Validation.js per feature + authMiddleware.js)
- All routes live in app.js, grouped under "// ===================== SECTION =====================" headers
- Errors returned as res.status(code).json({ error: "message" })
- Frontend: one <feature>.html + js/<feature>.js per page, shared js/main.js with apiBaseUrl, fetch with credentials: "include"
- Jest tests in backend/test/controller and backend/test/model, mocking the model / mssql like the BED tests

Auth already exists: JWT in an HTTP-only cookie named "token". Use verifyToken, then requireCustomer or requireEmployee from middlewares/authMiddleware.js. req.user = { id, email, role }.
Use Joi .email({ tlds: { allow: false } }) for emails.

Never commit .env. Never touch node_modules.