// Motion for the page: scroll reveals, the hero's pointer light and logo glint.
// The component below is the same logic the design canvas runs; here it is mounted once on load.
class DCLogic { constructor() { this.props = {}; this.state = {}; } }

class Component extends DCLogic {
  renderVals() {
    return { accent: this.props.accent ?? '#1E3A9B' };
  }

  componentDidMount() {
    var root = document.getElementById('ams');
    if (!root) return;
    var self = this;
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Hero film: started from script (muted, inline) so it works wherever autoplay attributes are ignored,
    // left alone for reduced motion, and paused whenever the hero is off screen.
    var film = root.querySelector('.h-video');
    var playFilm = function () {
      if (!film || calm) return;
      film.muted = true;
      var p = film.play();
      if (p && p.catch) p.catch(function () {});
    };
    if (film && !calm) {
      film.addEventListener('playing', function () { film.setAttribute('data-on', ''); }, { once: true });
      playFilm();
    }

    // Pointer light: a pool of light follows the cursor across the wall. Decorative, so it eases toward the
    // pointer instead of snapping to it, runs only while it has somewhere to go, and only for a real mouse.
    var hero = root.querySelector('.hero');
    var light = root.querySelector('.h-light');
    var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (hero && light && fine && !calm) {
      var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, seen = false;
      var step = function () {
        cx += (tx - cx) * 0.11; cy += (ty - cy) * 0.11;
        light.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
        raf = (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.6) ? requestAnimationFrame(step) : 0;
      };
      hero.addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        var r = hero.getBoundingClientRect();
        tx = e.clientX - r.left; ty = e.clientY - r.top;
        if (!seen) { seen = true; cx = tx; cy = ty; }
        light.setAttribute('data-on', '');
        if (!raf) raf = requestAnimationFrame(step);
      });
      hero.addEventListener('pointerleave', function () { light.removeAttribute('data-on'); });
      // When the pointer reaches the sign, the steel catches the light once (never more than every 2.5s).
      var sign = root.querySelector('.h-logo');
      var bar = root.querySelector('.h-sheen-bar');
      var lastGlint = 0;
      if (sign && bar && bar.animate) {
        sign.addEventListener('pointerenter', function () {
          var now = Date.now();
          if (now - lastGlint < 2500) return;
          lastGlint = now;
          bar.animate([{ transform: 'translateX(-110%)' }, { transform: 'translateX(110%)' }],
            { duration: 1300, easing: 'cubic-bezier(0.77, 0, 0.175, 1)' });
        });
      }
      this._stopLight = function () { if (raf) cancelAnimationFrame(raf); };
    }

    if (!('IntersectionObserver' in window)) return;   // content stays visible, nothing is armed

    if (film && !calm) {
      var filmIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { if (entry.isIntersecting) playFilm(); else film.pause(); });
      }, { threshold: 0.05 });
      filmIo.observe(film);
      this._filmIo = filmIo;
    }

    // Scroll reveals are armed here rather than in CSS alone: if this never runs, nothing is hidden.
    var heard = false;
    root.setAttribute('data-motion', 'on');
    var io = new IntersectionObserver(function (entries) {
      heard = true;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.setAttribute('data-in', '');
        io.unobserve(entry.target);          // once: re-animating on every pass fights the reader
      });
    }, { rootMargin: '0px 0px -64px 0px', threshold: 0.06 });
    root.querySelectorAll('[data-reveal]').forEach(function (el) { io.observe(el); });
    this._io = io;
    // If the observer has not reported at all, it is not working here: show everything.
    this._t = setTimeout(function () {
      if (!heard) { root.removeAttribute('data-motion'); if (self._io) self._io.disconnect(); }
    }, 2500);
  }

  componentWillUnmount() {
    if (this._io) this._io.disconnect();
    if (this._filmIo) this._filmIo.disconnect();
    if (this._stopLight) this._stopLight();
    if (this._t) clearTimeout(this._t);
  }
}

document.addEventListener('DOMContentLoaded', function () { new Component().componentDidMount(); });
