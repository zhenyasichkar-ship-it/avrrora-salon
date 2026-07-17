/* Avrrora — content loader. Fetches assets/content.json and hydrates the
   editable parts of every page (services, works, FAQ, contacts). Page scripts
   that need the data subscribe via AvrroraContent.ready(fn). Loaded
   synchronously in <head> so inline page scripts can always see it. */
(function () {
  var queue = [];
  var content = null;

  window.AvrroraContent = {
    ready: function (fn) { if (content) fn(content); else queue.push(fn); }
  };

  fetch('assets/content.json?ts=' + Date.now())
    .then(function (r) { return r.json(); })
    .then(function (data) {
      content = data;
      window.AVR_CONTENT = data;
      apply(data);
      queue.forEach(function (fn) { fn(data); });
      queue = [];
    })
    .catch(function (e) { console.error('content.json failed to load', e); });

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el && text) el.textContent = text;
  }

  function apply(c) {
    var run = function () { applyContacts(c); applyServices(c); hydrateIds(c); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  }

  // Phone / instagram / footer line are repeated on every page — patch them all.
  function applyContacts(c) {
    var ct = c.contacts || {};
    if (ct.phone) {
      document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
        a.href = 'tel:' + ct.phone;
        // Only rewrite text when it looks like a phone number (not the ✆ icon).
        if (/\d{3}/.test(a.textContent)) a.textContent = ct.phoneDisplay || ct.phone;
      });
    }
    if (ct.instagram) {
      document.querySelectorAll('a[href*="instagram.com"]').forEach(function (a) {
        a.href = 'https://instagram.com/' + ct.instagram;
        if (a.textContent.indexOf('@') === 0) a.textContent = '@' + ct.instagram;
      });
    }
    if (ct.footerLine) {
      document.querySelectorAll('footer p').forEach(function (p) {
        if (p.textContent.indexOf('Салон краси') === 0) p.textContent = ct.footerLine;
      });
    }
  }

  // Services page price cards render into #svc-cards (display:contents keeps
  // the parent section's flex gap working).
  function applyServices(c) {
    var host = document.getElementById('svc-cards');
    if (!host || !c.services) return;
    host.innerHTML = '';
    (c.services.categories || []).forEach(function (cat) {
      var card = document.createElement('div');
      card.setAttribute('data-reveal', '1');
      card.setAttribute('style', 'display:grid;grid-template-columns:minmax(260px,2fr) 3fr;gap:0;border-radius:26px;overflow:hidden;background:#fff;border:1px solid rgba(11,11,22,0.06);box-shadow:0 14px 40px rgba(11,11,22,0.07);');
      var img = document.createElement('img');
      img.src = cat.image || 'images/haircut.jpg';
      img.alt = cat.title;
      img.setAttribute('style', 'width:100%;height:100%;min-height:280px;object-fit:cover;');
      var body = document.createElement('div');
      body.setAttribute('style', 'padding:38px 42px;');
      var h = document.createElement('h2');
      h.textContent = cat.title;
      h.setAttribute('style', "margin:0 0 22px;font-family:'Unbounded',sans-serif;font-weight:500;font-size:24px;");
      var list = document.createElement('div');
      list.setAttribute('style', 'display:flex;flex-direction:column;gap:14px;font-size:16px;');
      (cat.items || []).forEach(function (it, i, arr) {
        var row = document.createElement('div');
        var last = i === arr.length - 1;
        row.setAttribute('style', 'display:flex;justify-content:space-between;gap:16px;' + (last ? '' : 'border-bottom:1px solid rgba(11,11,22,0.07);padding-bottom:14px;'));
        var name = document.createElement('span'); name.textContent = it.name;
        var price = document.createElement('span'); price.textContent = it.price;
        price.setAttribute('style', 'font-weight:700;color:#2f4fd8;white-space:nowrap;');
        row.appendChild(name); row.appendChild(price);
        list.appendChild(row);
      });
      body.appendChild(h); body.appendChild(list);
      card.appendChild(img); card.appendChild(body);
      host.appendChild(card);
    });
    if (window.Avrrora) window.Avrrora.init(host);
  }

  // Elements that opt in via id get their content from JSON.
  function hydrateIds(c) {
    setText('cms-hero-tagline', c.hero && c.hero.tagline);
    setText('cms-services-intro', c.services && c.services.intro);
    var ct = c.contacts || {};
    setText('cms-contacts-blurb', ct.headerBlurb);
    setText('cms-booking-title', ct.bookingTitle);
    setText('cms-booking-subtitle', ct.bookingSubtitle);
    (ct.directions || []).forEach(function (d, i) {
      setText('cms-dir-title-' + i, d.title);
      setText('cms-dir-text-' + i, d.text);
    });
    var ba = c.works && c.works.beforeAfter;
    if (ba) {
      var el;
      if ((el = document.getElementById('cms-ba-after'))) el.src = ba.after;
      if ((el = document.getElementById('cms-ba-before'))) el.src = ba.before;
      setText('cms-ba-title', ba.title);
      setText('cms-ba-text', ba.text);
      setText('cms-ba-note', ba.note);
    }
  }
})();
