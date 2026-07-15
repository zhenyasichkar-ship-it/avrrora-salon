/* Avrrora — shared front-end behaviour (replaces the prototype support.js).
   Handles: style-hover attributes (":hover" styles) and data-reveal scroll animations.
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

  // Exposed so page scripts can re-bind after rendering dynamic content.
  window.Avrrora = {
    bindHover: bindHover,
    bindReveal: bindReveal,
    init: function (root) { bindHover(root); bindReveal(root); }
  };

  function init() { bindHover(document); bindReveal(document); }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
