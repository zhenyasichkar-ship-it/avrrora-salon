/* Avrrora — AI chat widget. A floating button in the bottom-right stack opens
   a Q&A panel backed by /api/chat (Gemini Flash + the site's content.json).
   History lives in sessionStorage; the visitor's chat id in localStorage.
   Dark theme comes from html.avr-dark rules below; UK/EN text is translated
   by the i18n MutationObserver like the rest of the site. */
(function () {
  'use strict';
  var HISTORY_KEY = 'avr-chat-history';
  var ID_KEY = 'avr-chat-id';

  var css = document.createElement('style');
  css.textContent =
    '#avr-chat-panel{position:fixed;right:20px;bottom:88px;z-index:130;width:min(380px,calc(100vw - 32px));height:min(560px,72vh);display:none;flex-direction:column;background:#fff;border-radius:20px;border:1px solid rgba(11,11,22,0.1);box-shadow:0 24px 70px rgba(11,11,22,0.28);overflow:hidden;font-family:Manrope,sans-serif;}' +
    '#avr-chat-panel.open{display:flex;}' +
    '.avr-chat-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:15px 18px;background:linear-gradient(120deg,#2f4fd8,#7a3ff2);color:#fff;}' +
    '.avr-chat-head p{margin:0;font-weight:800;font-size:15px;}' +
    '.avr-chat-head span{display:block;margin-top:2px;font-size:12px;font-weight:600;color:rgba(255,255,255,0.75);}' +
    '.avr-chat-close{border:none;background:rgba(255,255,255,0.15);color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:14px;line-height:1;flex:none;}' +
    '.avr-chat-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#f7f7fb;}' +
    '.avr-chat-b{max-width:85%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.55;white-space:pre-wrap;word-wrap:break-word;}' +
    '.avr-chat-b.user{align-self:flex-end;background:linear-gradient(120deg,#2f4fd8,#7a3ff2);color:#fff;border-bottom-right-radius:6px;}' +
    '.avr-chat-b.bot{align-self:flex-start;background:#fff;color:#26263a;border:1px solid rgba(11,11,22,0.08);border-bottom-left-radius:6px;}' +
    '.avr-chat-b.typing{color:#8a8aa0;letter-spacing:2px;}' +
    '.avr-chat-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 10px;background:#f7f7fb;}' +
    '.avr-chat-chip{border:1px solid rgba(11,11,22,0.14);background:#fff;color:#3c3c50;border-radius:100px;padding:7px 12px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:Manrope,sans-serif;}' +
    '.avr-chat-chip:hover{border-color:#7a3ff2;color:#7a3ff2;}' +
    '.avr-chat-form{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(11,11,22,0.08);background:#fff;}' +
    '.avr-chat-form input{flex:1;border:1px solid rgba(11,11,22,0.14);border-radius:100px;padding:11px 16px;font-size:14px;font-family:Manrope,sans-serif;color:#0b0b16;background:#fff;}' +
    '.avr-chat-form input:focus{outline:2px solid #7a3ff2;border-color:transparent;}' +
    '.avr-chat-form button{border:none;border-radius:100px;padding:11px 18px;background:linear-gradient(120deg,#2f4fd8,#7a3ff2);color:#fff;font-weight:800;font-size:14px;cursor:pointer;font-family:Manrope,sans-serif;flex:none;}' +
    '.avr-chat-form button:disabled{opacity:.55;cursor:default;}' +
    '@media(max-width:520px){#avr-chat-panel{right:12px;left:12px;bottom:84px;width:auto;height:min(560px,68vh);}}' +
    /* dark theme */
    'html.avr-dark #avr-chat-panel{background:#14141f;border-color:rgba(255,255,255,0.12);}' +
    'html.avr-dark .avr-chat-msgs{background:#0f0f18;}' +
    'html.avr-dark .avr-chat-b.bot{background:#1c1c2a;color:#e4e4ef;border-color:rgba(255,255,255,0.1);}' +
    'html.avr-dark .avr-chat-chips{background:#0f0f18;}' +
    'html.avr-dark .avr-chat-chip{background:#1c1c2a;color:#c8c8da;border-color:rgba(255,255,255,0.16);}' +
    'html.avr-dark .avr-chat-form{background:#14141f;border-top-color:rgba(255,255,255,0.1);}' +
    'html.avr-dark .avr-chat-form input{background:#1c1c2a;color:#f0f0f6;border-color:rgba(255,255,255,0.16);}';
  document.head.appendChild(css);

  function chatId() {
    try {
      var id = localStorage.getItem(ID_KEY);
      if (!id) {
        id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(ID_KEY, id);
      }
      return id;
    } catch (e) { return 'anon'; }
  }
  function loadHistory() {
    try { return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveHistory(h) {
    try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-20))); } catch (e) {}
  }

  var history = loadHistory();
  var busy = false;
  var GREETING = 'Привіт! Я допоможу з питаннями про послуги, ціни та запис. Що вас цікавить?';
  var CHIPS = ['Ціни на фарбування', 'Як записатися?', 'Де ви знаходитесь?'];

  function build() {
    var stack = document.querySelector('div[style*="position:fixed"][style*="right:20px"][style*="bottom:20px"]');
    if (!stack || document.getElementById('avr-chat-btn')) return;

    var btn = document.createElement('button');
    btn.id = 'avr-chat-btn';
    btn.type = 'button';
    btn.title = 'Чат-консультант';
    btn.setAttribute('style', 'display:flex;align-items:center;justify-content:center;width:54px;height:54px;border-radius:50%;border:none;background:linear-gradient(120deg,#7a3ff2,#2f4fd8);color:#fff;font-size:22px;cursor:pointer;box-shadow:0 12px 30px rgba(122,63,242,0.45);transition:transform .3s;');
    btn.textContent = '💬';
    stack.insertBefore(btn, stack.firstChild);

    var panel = document.createElement('div');
    panel.id = 'avr-chat-panel';
    panel.innerHTML =
      '<div class="avr-chat-head">' +
        '<div><p>Консультант Avrrora</p><span>Питання про послуги, ціни та запис</span></div>' +
        '<button type="button" class="avr-chat-close" aria-label="Закрити">✕</button>' +
      '</div>' +
      '<div class="avr-chat-msgs" id="avr-chat-msgs"></div>' +
      '<div class="avr-chat-chips" id="avr-chat-chips"></div>' +
      '<form class="avr-chat-form" id="avr-chat-form">' +
        '<input type="text" maxlength="500" placeholder="Ваше питання…" autocomplete="off"/>' +
        '<button type="submit">➤</button>' +
      '</form>';
    document.body.appendChild(panel);

    var msgs = panel.querySelector('#avr-chat-msgs');
    var chips = panel.querySelector('#avr-chat-chips');
    var form = panel.querySelector('#avr-chat-form');
    var input = form.querySelector('input');
    var send = form.querySelector('button');

    function bubble(role, text) {
      var d = document.createElement('div');
      d.className = 'avr-chat-b ' + role;
      d.textContent = text;
      msgs.appendChild(d);
      msgs.scrollTop = msgs.scrollHeight;
      return d;
    }

    function renderChips() {
      chips.innerHTML = '';
      if (history.length) return;
      CHIPS.forEach(function (q) {
        var c = document.createElement('button');
        c.type = 'button';
        c.className = 'avr-chat-chip';
        c.textContent = q;
        c.addEventListener('click', function () { ask(c.textContent); });
        chips.appendChild(c);
      });
    }

    function renderAll() {
      msgs.innerHTML = '';
      bubble('bot', GREETING);
      history.forEach(function (m) { bubble(m.role === 'user' ? 'user' : 'bot', m.text); });
      renderChips();
    }

    function ask(question) {
      if (busy || !question.trim()) return;
      busy = true;
      send.disabled = true;
      input.value = '';
      chips.innerHTML = '';
      history.push({ role: 'user', text: question.trim().slice(0, 500) });
      saveHistory(history);
      bubble('user', question.trim());
      var typing = bubble('bot', '● ● ●');
      typing.classList.add('typing');

      var lang = 'uk';
      try { lang = localStorage.getItem('avr-lang') === 'en' ? 'en' : 'uk'; } catch (e) {}

      var done = function () { busy = false; send.disabled = false; };
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-10), chatId: chatId(), lang: lang })
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          typing.remove();
          var text = res.ok && res.d.answer
            ? res.d.answer
            : (res.d.error || 'Щось пішло не так — спробуйте ще раз або зателефонуйте нам.');
          if (res.ok && res.d.answer) {
            history.push({ role: 'assistant', text: text });
            saveHistory(history);
          }
          bubble('bot', text);
          done();
        })
        .catch(function () {
          typing.remove();
          bubble('bot', 'Немає зв\'язку з сервером — спробуйте ще раз пізніше.');
          done();
        });
    }

    btn.addEventListener('click', function () {
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) {
        renderAll();
        input.focus();
      }
    });
    panel.querySelector('.avr-chat-close').addEventListener('click', function () {
      panel.classList.remove('open');
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      ask(input.value);
    });
  }

  if (document.readyState !== 'loading') build();
  else document.addEventListener('DOMContentLoaded', build);
})();
