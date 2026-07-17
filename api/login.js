// POST /api/login { password } -> { token, exp }
// Env: ADMIN_PASSWORD (required), SESSION_SECRET (optional, falls back to password).
const crypto = require('crypto');

function sign(exp, secret) {
  return crypto.createHmac('sha256', secret).update('avr-admin:' + exp).digest('hex');
}

module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return res.status(503).json({ error: 'ADMIN_PASSWORD is not configured on Vercel' });

  const supplied = (req.body && req.body.password) || '';
  const a = Buffer.from(String(supplied));
  const b = Buffer.from(password);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) return res.status(401).json({ error: 'Невірний пароль' });

  const exp = Date.now() + 7 * 24 * 3600 * 1000; // 7 days
  const secret = process.env.SESSION_SECRET || password;
  res.status(200).json({ token: exp + '.' + sign(exp, secret), exp });
};

module.exports.verifyToken = function (token) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !token) return false;
  const parts = String(token).split('.');
  if (parts.length !== 2) return false;
  const exp = parseInt(parts[0], 10);
  if (!exp || exp < Date.now()) return false;
  const secret = process.env.SESSION_SECRET || password;
  const expected = sign(exp, secret);
  try {
    return crypto.timingSafeEqual(Buffer.from(parts[1]), Buffer.from(expected));
  } catch (e) {
    return false;
  }
};
