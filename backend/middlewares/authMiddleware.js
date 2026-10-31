const jwt = require('jsonwebtoken');

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((acc, pair) => {
    const [key, value] = pair.trim().split('=');
    if (key) acc[key] = decodeURIComponent(value || '');
    return acc;
  }, {});
}

function verifyToken(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { verifyToken };
