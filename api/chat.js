// The site's AI assistant (Q&A only).
//   POST /api/chat { messages: [{role, text}...], chatId, lang }  -> { answer }
//   GET  /api/chat  (admin, Bearer token)                         -> { logs, stats }
// Knowledge comes from the live assets/content.json of this deployment, so
// admin edits to services/prices are reflected without any retraining.
// Env (either provider works; CHAT_API_KEY wins when both are set):
//   CHAT_API_KEY   — OpenAI-compatible provider key (e.g. cuberout.dev)
//   CHAT_API_URL   — default https://api.cuberout.dev/v1/chat/completions
//   CHAT_MODEL     — default deepseek-v4-flash
//   GEMINI_API_KEY / GEMINI_MODEL (default gemini-2.5-flash)
const { verifyToken } = require('./login.js');
const { db, ensure } = require('./_lib.js');

// ---- knowledge cache (per warm instance) ----
let knowledge = { text: null, at: 0 };
async function getKnowledge() {
  if (knowledge.text && Date.now() - knowledge.at < 5 * 60 * 1000) return knowledge.text;
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://avrrora-salon.vercel.app';
  const r = await fetch(`${base}/assets/content.json`);
  if (!r.ok) throw new Error('content.json fetch failed');
  const c = await r.json();
  const lines = [];
  lines.push('# Послуги та ціни');
  for (const cat of c.services.categories) {
    lines.push(`## ${cat.title}`);
    for (const it of cat.items) lines.push(`- ${it.name}: ${it.price}`);
  }
  lines.push(`\nПримітка про ціни: ${c.services.intro}`);
  lines.push('\n# Часті питання');
  for (const f of c.faq) lines.push(`Q: ${f.q}\nA: ${f.a}`);
  const ct = c.contacts;
  lines.push('\n# Контакти');
  lines.push(`Адреса: ${ct.headerBlurb}`);
  lines.push(`Телефон: ${ct.phoneDisplay} (${ct.phone})`);
  lines.push(`Instagram: @${ct.instagram}`);
  for (const d of ct.directions || []) lines.push(`${d.title}: ${d.text}`);
  lines.push('\n# Онлайн-запис');
  lines.push('Записатися на консультацію можна онлайн на сторінці «Контакти» (кнопка «Записатися на консультацію» на головній): клієнт обирає день (будні, найближчі 14 днів) і час (слоти по 30 хвилин з 10:00 до 18:30), залишає ім\'я та телефон. Також можна записатися за телефоном або в Instagram Direct.');
  lines.push('\n# Акції');
  lines.push('- «Щаслива година»: −15% у будні до 12:00');
  lines.push('- Перший візит до салону: −10%');
  lines.push('- Приведіть подругу — знижка −10% обом');
  lines.push('- Подарункові сертифікати на 1000/2000/3000/5000 грн, діють 6 місяців');
  knowledge = { text: lines.join('\n'), at: Date.now() };
  return knowledge.text;
}

// ---- naive per-instance rate limit ----
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 5 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 20;
}

async function handleChat(req, res) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0] || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Забагато запитів — зачекайте хвилинку.' });
  }

  // Provider: an OpenAI-compatible endpoint (CHAT_API_*) takes priority;
  // Gemini (GEMINI_API_KEY) remains as the alternative.
  const oaiKey = process.env.CHAT_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!oaiKey && !geminiKey) {
    return res.status(503).json({ error: 'Консультант тимчасово недоступний — зателефонуйте нам, будь ласка.' });
  }

  const b = req.body || {};
  const lang = b.lang === 'en' ? 'en' : 'uk';
  const raw = Array.isArray(b.messages) ? b.messages.slice(-10) : [];
  const messages = raw
    .map((m) => ({
      role: m && m.role === 'assistant' ? 'model' : 'user',
      text: String((m && m.text) || '').slice(0, 800).trim()
    }))
    .filter((m) => m.text);
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Порожнє питання' });
  }

  let facts;
  try {
    facts = await getKnowledge();
  } catch (e) {
    console.error('knowledge load failed:', e);
    return res.status(502).json({ error: 'Консультант тимчасово недоступний — зателефонуйте нам, будь ласка.' });
  }

  const system = [
    'Ти — доброзичливий онлайн-консультант салону краси Avrrora у Києві.',
    'Відповідай коротко (2–4 речення), тепло і по суті. Твоя мета — допомогти клієнту і м\'яко підвести до запису на консультацію.',
    lang === 'en'
      ? 'Answer in English (the visitor is browsing the English version of the site).'
      : 'Відповідай українською.',
    'Правила:',
    '- Відповідай ЛИШЕ на питання про салон Avrrora: послуги, ціни, запис, графік, адресу, догляд за волоссям. На сторонні теми чемно скажи, що можеш допомогти лише з питаннями про салон.',
    '- Ціни називай ТІЛЬКИ з бази знань нижче, дослівно, з приміткою що це ціна «від». НІКОЛИ не вигадуй ціну чи послугу, якої немає в базі.',
    '- Якщо відповіді немає в базі знань — чесно скажи це і запропонуй зателефонувати (098 777 98 98) або написати в Instagram @avrrorabeauty.',
    '- Не давай медичних порад.',
    '',
    'База знань салону:',
    facts
  ].join('\n');

  let answer;
  try {
    if (oaiKey) {
      // OpenAI-compatible chat/completions (e.g. cuberout.dev). The model may
      // be a reasoning model that spends tokens thinking before it answers,
      // so the limit is generous and only message.content is used.
      const url = process.env.CHAT_API_URL || 'https://api.cuberout.dev/v1/chat/completions';
      const model = process.env.CHAT_MODEL || 'deepseek-v4-flash';
      // The provider 500s on raw non-ASCII bytes, so escape everything to
      // \uXXXX — byte-for-byte ASCII, semantically identical JSON.
      const body = JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          ...messages.map((m) => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text }))
        ],
        max_tokens: 2048,
        temperature: 0.4
      }).split('').map((c) => c.charCodeAt(0) > 127 ? String.fromCharCode(92) + 'u' + c.charCodeAt(0).toString(16).padStart(4, '0') : c).join('');
      let lastErr;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const r = await fetch(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${oaiKey}`, 'Content-Type': 'application/json' },
            body
          });
          const data = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error('chat api ' + r.status + ': ' + JSON.stringify(data).slice(0, 300));
          answer = String(((data.choices || [])[0]?.message?.content) || '').trim();
          if (!answer) throw new Error('empty answer: ' + JSON.stringify(data).slice(0, 300));
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e; // the provider occasionally 500s cold; one retry
        }
      }
      if (lastErr) throw lastErr;
    } else {
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
          generationConfig: { maxOutputTokens: 512, temperature: 0.4 }
        })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error('Gemini ' + r.status + ': ' + JSON.stringify(data).slice(0, 300));
      answer = ((data.candidates || [])[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
      if (!answer) throw new Error('empty answer: ' + JSON.stringify(data).slice(0, 300));
    }
  } catch (e) {
    console.error('chat provider error:', e);
    return res.status(502).json({ error: 'Консультант тимчасово недоступний — зателефонуйте нам, будь ласка.' });
  }

  // Log to the admin request base — best-effort, never blocks the answer.
  try {
    const sql = db();
    if (sql) {
      await ensure(sql);
      const question = messages[messages.length - 1].text;
      const chatId = String(b.chatId || '').slice(0, 64) || null;
      await sql`INSERT INTO avrrora_chat_log (chat_id, question, answer, lang)
                VALUES (${chatId}, ${question}, ${answer.slice(0, 4000)}, ${lang})`;
    }
  } catch (e) {
    console.error('chat log failed:', e);
  }

  res.status(200).json({ answer });
}

async function handleLog(req, res) {
  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!verifyToken(auth)) return res.status(401).json({ error: 'Сесія недійсна — увійдіть знову' });
  const sql = db();
  if (!sql) return res.status(503).json({ error: 'База даних не налаштована' });
  try {
    await ensure(sql);
    const logs = await sql`SELECT id, chat_id, question, answer, lang, created_at
                           FROM avrrora_chat_log ORDER BY id DESC LIMIT 200`;
    const [stat] = await sql`SELECT count(*)::int AS total,
                             count(*) FILTER (WHERE created_at >= current_date)::int AS today,
                             count(DISTINCT chat_id)::int AS chats
                             FROM avrrora_chat_log`;
    res.status(200).json({ logs, stats: stat });
  } catch (e) {
    console.error('DB error in chat log:', e);
    res.status(502).json({ error: 'База даних недоступна' });
  }
}

module.exports = async (req, res) => {
  if (req.method === 'POST') return handleChat(req, res);
  if (req.method === 'GET') return handleLog(req, res);
  res.status(405).json({ error: 'Method not allowed' });
};
