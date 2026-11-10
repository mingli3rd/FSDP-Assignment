// Mobile banking demo (extension screens E1-E10), served on its own port.
//   http://localhost:4000   <- mobile app
//   http://localhost:3000   <- API + SpellBreak platform (app.js)
//
// Starts automatically with `npm run dev` (app.js requires this file),
// or on its own with `npm run mobile`.
//
// Any /api/... request from the mobile app is forwarded to the API on
// port 3000, so the mobile pages can use the same backend (and cookies)
// without any CORS setup.

const path = require("path");
const http = require("http");
const express = require("express");

const MOBILE_PORT = process.env.MOBILE_PORT || 4000;
const API_PORT = process.env.PORT || 3000;

const mobile = express();

// ---- Forward /api/* to the main API (streams the body, so file uploads work too) ----
mobile.use("/api", (req, res) => {
  const forward = http.request(
    {
      host: "localhost",
      port: API_PORT,
      path: "/api" + req.url,
      method: req.method,
      headers: { ...req.headers, host: `localhost:${API_PORT}` },
    },
    (apiRes) => {
      res.writeHead(apiRes.statusCode, apiRes.headers);
      apiRes.pipe(res);
    }
  );
  forward.on("error", () => {
    if (!res.headersSent) {
      res.status(502).json({ error: `API is not running on port ${API_PORT}. Start it with npm run dev.` });
    }
  });
  req.pipe(forward);
});

// ---- Serve the mobile app (SpellBreak/mobile) ----
mobile.use(express.static(path.join(__dirname, "..", "mobile")));

mobile.listen(MOBILE_PORT, () => {
  console.log(`Mobile banking demo running on port ${MOBILE_PORT}`);
  console.log(`→ http://localhost:${MOBILE_PORT}`);
});
