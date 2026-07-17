// POST /api/booking { name, phone, service, date, time, website }
// Stores the booking in Postgres (one active booking per slot) and pings
// Telegram if a bot is configured. "website" is a honeypot field.
const { db, ensure, SLOTS, BOOKING_DAYS } = require('./_lib.js');

async function notifyTelegram(text) {
  const bot = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!bot || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text })
    });
  } catch (e) { /* notification is best-effort */ }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const b = req.body || {};
  if (b.website) return res.status(200).json({ ok: true }); // honeypot

  const name = String(b.name || '').trim().slice(0, 100);
  const phone = String(b.phone || '').trim().slice(0, 30);
  const service = String(b.service || '').trim().slice(0, 120);
  const date = String(b.date || '').trim();
  const time = String(b.time || '').trim();

  if (!name || phone.replace(/\D/g, '').length < 9) {
    return res.status(400).json({ error: "Вкажіть ім'я та коректний номер телефону" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !SLOTS.includes(time)) {
    return res.status(400).json({ error: 'Оберіть дату та час візиту' });
  }
  const day = new Date(date + 'T12:00:00Z');
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  if (isNaN(day) || day < today || day - today > BOOKING_DAYS * 24 * 3600 * 1000) {
    return res.status(400).json({ error: 'Запис можливий лише на найближчі ' + BOOKING_DAYS + ' днів' });
  }
  const weekday = day.getUTCDay();
  if (weekday === 0 || weekday === 6) {
    return res.status(400).json({ error: 'Онлайн-запис працює у будні (пн–пт)' });
  }

  const sql = db();
  if (!sql) {
    return res.status(503).json({ error: 'Онлайн-запис тимчасово недоступний — зателефонуйте нам, будь ласка.' });
  }

  try {
    await ensure(sql);
    await sql`INSERT INTO bookings (name, phone, service, date, time)
              VALUES (${name}, ${phone}, ${service || null}, ${date}, ${time})`;
  } catch (e) {
    if (String(e.message || '').includes('bookings_slot')) {
      return res.status(409).json({ error: 'Цей час щойно зайняли — оберіть, будь ласка, інший.' });
    }
    return res.status(502).json({ error: 'Не вдалося зберегти запис — зателефонуйте нам, будь ласка.' });
  }

  await notifyTelegram([
    '💜 Новий запис на консультацію',
    '',
    '📅 ' + date + ' о ' + time,
    '👤 ' + name,
    '📞 ' + phone,
    service ? '✂️ ' + service : null
  ].filter(Boolean).join('\n'));

  res.status(200).json({ ok: true });
};
