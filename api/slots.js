// GET /api/slots?date=YYYY-MM-DD -> { slots: [...all], taken: [...busy] }
const { db, ensure, SLOTS } = require('./_lib.js');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const sql = db();
  if (!sql) return res.status(503).json({ error: 'База даних не налаштована' });

  const date = String(req.query.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Некоректна дата' });

  try {
    await ensure(sql);
    const rows = await sql`SELECT time FROM bookings WHERE date = ${date} AND status <> 'cancelled'`;
    res.status(200).json({ slots: SLOTS, taken: rows.map((r) => r.time) });
  } catch (e) {
    console.error('DB error in slots:', e);
    res.status(502).json({ error: 'База даних недоступна' });
  }
};
