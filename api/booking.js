// POST /api/booking { name, phone, service, comment, website }
// Sends the request to the salon's Telegram. "website" is a honeypot — real
// visitors never fill it, bots do.
// Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const bot = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!bot || !chat) {
    return res.status(503).json({ error: 'Форма тимчасово недоступна — зателефонуйте нам, будь ласка.' });
  }

  const b = req.body || {};
  if (b.website) return res.status(200).json({ ok: true }); // honeypot: pretend success
  const name = String(b.name || '').trim().slice(0, 100);
  const phone = String(b.phone || '').trim().slice(0, 30);
  const service = String(b.service || '').trim().slice(0, 120);
  const comment = String(b.comment || '').trim().slice(0, 500);
  if (!name || phone.replace(/\D/g, '').length < 9) {
    return res.status(400).json({ error: "Вкажіть ім'я та коректний номер телефону" });
  }

  const text = [
    '💜 Нова заявка з сайту',
    '',
    '👤 ' + name,
    '📞 ' + phone,
    service ? '✂️ ' + service : null,
    comment ? '💬 ' + comment : null
  ].filter(Boolean).join('\n');

  try {
    const r = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.ok) throw new Error(data.description || 'telegram error');
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: 'Не вдалося надіслати заявку — зателефонуйте нам, будь ласка.' });
  }
};
