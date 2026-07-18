// Admin-only booking management.
//   GET    /api/requests?scope=active|all   -> { bookings: [...], stats: {...} }
//   PATCH  /api/requests { id, status?, name?, phone?, service?, date?, time? }
//   DELETE /api/requests { id }
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
                    FROM avrrora_bookings ORDER BY date DESC, time DESC LIMIT 300`
        : await sql`SELECT id, name, phone, service, to_char(date, 'YYYY-MM-DD') AS date, time, status, created_at
                    FROM avrrora_bookings WHERE status IN ('new', 'contacted') AND date >= current_date - 1
                    ORDER BY date ASC, time ASC LIMIT 300`;
      const statRows = await sql`SELECT status, count(*)::int AS n FROM avrrora_bookings GROUP BY status`;
      const stats = { total: 0, new: 0, contacted: 0, done: 0, cancelled: 0 };
      statRows.forEach((r) => { if (r.status in stats) stats[r.status] = r.n; stats.total += r.n; });
      return res.status(200).json({ bookings: rows, stats });
    }

    if (req.method === 'PATCH') {
      const b = req.body || {};
      const id = parseInt(b.id, 10);
      if (!id) return res.status(400).json({ error: 'Некоректний запит' });
      if (b.status !== undefined && !STATUSES.includes(b.status)) return res.status(400).json({ error: 'Некоректний статус' });
      if (b.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) return res.status(400).json({ error: 'Некоректна дата' });
      if (b.time !== undefined && !/^\d{2}:\d{2}$/.test(b.time)) return res.status(400).json({ error: 'Некоректний час' });
      const name = b.name !== undefined ? String(b.name).trim().slice(0, 100) : null;
      if (b.name !== undefined && !name) return res.status(400).json({ error: "Ім'я не може бути порожнім" });
      const phone = b.phone !== undefined ? String(b.phone).trim().slice(0, 30) : null;
      if (b.phone !== undefined && phone.replace(/\D/g, '').length < 9) return res.status(400).json({ error: 'Некоректний телефон' });
      const service = b.service !== undefined ? String(b.service).trim().slice(0, 120) : null;

      try {
        await sql`UPDATE avrrora_bookings SET
          status  = COALESCE(${b.status || null}, status),
          name    = COALESCE(${name}, name),
          phone   = COALESCE(${phone}, phone),
          service = CASE WHEN ${b.service !== undefined} THEN ${service || null} ELSE service END,
          date    = COALESCE(${b.date || null}, date),
          time    = COALESCE(${b.time || null}, time)
          WHERE id = ${id}`;
      } catch (e) {
        if (String(e.message || '').includes('avrrora_bookings_slot')) {
          return res.status(409).json({ error: 'На цей час вже є активний запис' });
        }
        throw e;
      }
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const id = parseInt(req.body && req.body.id, 10);
      if (!id) return res.status(400).json({ error: 'Некоректний запит' });
      await sql`DELETE FROM avrrora_bookings WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('DB error in requests:', e);
    res.status(502).json({ error: 'База даних недоступна' });
  }
};
