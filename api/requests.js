// Admin-only booking management.
//   GET  /api/requests?scope=active|all      -> { bookings: [...] }
//   PATCH /api/requests { id, status }       -> { ok: true }
// Auth: Authorization: Bearer <admin session token>.
const { verifyToken } = require('./login.js');
const { db, ensure, STATUSES } = require('./_lib.js');

module.exports = async (req, res) => {
  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!verifyToken(auth)) return res.status(401).json({ error: 'Сесія недійсна — увійдіть знову' });

  const sql = db();
  if (!sql) return res.status(503).json({ error: 'База даних не налаштована (Vercel → Storage → Neon)' });

  try {
    await ensure(sql);

    if (req.method === 'GET') {
      const scope = req.query.scope === 'all' ? 'all' : 'active';
      const rows = scope === 'all'
        ? await sql`SELECT id, name, phone, service, to_char(date, 'YYYY-MM-DD') AS date, time, status, created_at
                    FROM bookings ORDER BY date DESC, time DESC LIMIT 300`
        : await sql`SELECT id, name, phone, service, to_char(date, 'YYYY-MM-DD') AS date, time, status, created_at
                    FROM bookings WHERE status IN ('new', 'contacted') AND date >= current_date - 1
                    ORDER BY date ASC, time ASC LIMIT 300`;
      return res.status(200).json({ bookings: rows });
    }

    if (req.method === 'PATCH') {
      const id = parseInt(req.body && req.body.id, 10);
      const status = req.body && req.body.status;
      if (!id || !STATUSES.includes(status)) return res.status(400).json({ error: 'Некоректний запит' });
      await sql`UPDATE bookings SET status = ${status} WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(502).json({ error: 'База даних недоступна' });
  }
};
