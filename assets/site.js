/* Avrrora — shared front-end behaviour (replaces the prototype support.js).
   Handles: style-hover attributes, data-reveal scroll animations, and mobile
   adaptation (hamburger nav + responsive CSS overrides for inline styles).
   Page-specific interactivity (calculator, FAQ, gallery) lives inline on each page. */
(function () {
  // style-hover="..." → apply extra styles on hover, restore on leave.
  function bindHover(root) {
    (root || document).querySelectorAll('[style-hover]').forEach(function (el) {
      if (el.__hoverBound) return;
      el.__hoverBound = true;
      var hover = el.getAttribute('style-hover');
      var base = el.getAttribute('style') || '';
      el.addEventListener('mouseenter', function () { el.setAttribute('style', base + ';' + hover); });
      el.addEventListener('mouseleave', function () { el.setAttribute('style', base); });
    });
  }

  // data-reveal → fade/slide in when scrolled into view.
  function bindReveal(root) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'none';
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    (root || document).querySelectorAll('[data-reveal]').forEach(function (el) {
      if (el.__revealBound) return;
      el.__revealBound = true;
      if (el.getBoundingClientRect().top > window.innerHeight * 0.92) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(26px)';
        el.style.transition = 'opacity .9s cubic-bezier(.22,.61,.21,1), transform .9s cubic-bezier(.22,.61,.21,1)';
        io.observe(el);
      }
    });
  }

  // Inject responsive CSS once (overrides inline styles on small screens).
  function injectStyles() {
    if (document.getElementById('avr-responsive')) return;
    var css =
      '.avr-burger{display:none;align-items:center;justify-content:center;width:38px;height:38px;margin-left:auto;border:none;background:transparent;cursor:pointer;font-size:22px;line-height:1;color:#0b0b16;padding:0;}' +
      'html,body{overflow-x:hidden;}' +
      '@media (max-width:680px){' +
        // Full-width top bar instead of the floating pill.
        'nav.avr-nav{top:0 !important;left:0 !important;right:0 !important;transform:none !important;width:auto !important;box-sizing:border-box;justify-content:space-between !important;gap:12px !important;border-radius:0 !important;padding:15px 20px !important;background:rgba(255,255,255,0.94) !important;border:none !important;border-bottom:1px solid rgba(11,11,22,0.07) !important;box-shadow:0 6px 24px rgba(11,11,22,0.06) !important;}' +
        'nav.avr-nav > div{display:none !important;position:absolute;top:100%;left:0;right:0;flex-direction:column !important;align-items:flex-start;gap:16px !important;padding:18px 22px;border-radius:0 0 20px 20px;background:rgba(255,255,255,0.97);-webkit-backdrop-filter:blur(22px) saturate(1.7);backdrop-filter:blur(22px) saturate(1.7);border:1px solid rgba(11,11,22,0.08);border-top:none;box-shadow:0 14px 40px rgba(11,11,22,0.16);font-size:16px !important;}' +
        'nav.avr-nav.avr-open > div{display:flex !important;}' +
        '.avr-burger{display:inline-flex;}' +
        // Services cards: collapse the image/text 2-column grid to a single column.
        // Match loosely — the reveal animation re-serializes the style attribute
        // (adds spaces), so exact-substring selectors stop matching after scroll.
        '[style*="minmax(260px"][style*="3fr"]{grid-template-columns:1fr !important;}' +
        '[style*="38px 42px"]{padding:26px 22px !important;}' +
        // Works: before/after description block has a huge right padding on desktop.
        '[style*="10px 80px"]{padding:10px 6px !important;}' +
      '}';
    var style = document.createElement('style');
    style.id = 'avr-responsive';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // Turn the fixed nav pill into a hamburger menu on small screens.
  function setupMobileNav() {
    var nav = document.querySelector('nav');
    if (!nav || nav.__mobileBound) return;
    var links = nav.querySelector('div');
    if (!links) return;
    nav.__mobileBound = true;
    nav.classList.add('avr-nav');

    var burger = document.createElement('button');
    burger.className = 'avr-burger';
    burger.type = 'button';
    burger.setAttribute('aria-label', 'Меню');
    burger.setAttribute('aria-expanded', 'false');
    burger.textContent = '☰';
    nav.appendChild(burger);

    function setOpen(open) {
      nav.classList.toggle('avr-open', open);
      burger.textContent = open ? '✕' : '☰';
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!nav.classList.contains('avr-open'));
    });
    // Close when tapping a link or anywhere outside the nav.
    links.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  // Exposed so page scripts can re-bind after rendering dynamic content.
  window.Avrrora = {
    bindHover: bindHover,
    bindReveal: bindReveal,
    init: function (root) { bindHover(root); bindReveal(root); }
  };

  function init() {
    injectStyles();
    setupMobileNav();
    bindHover(document);
    bindReveal(document);
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
