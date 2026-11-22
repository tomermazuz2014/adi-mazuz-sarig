/**
 * PortraitScene — the About portrait: a living, cut-out figure standing in front of her panel.
 *
 * Markup (the still, the rim light and the two halos are plain HTML/CSS and work without this file):
 *
 *   <figure class="adi" data-reveal="clip" data-portrait data-portrait-film="public/adi-about.mp4">
 *     <div class="clip">…panel…</div>
 *     <div class="adi-glow"><div class="adi-glow-in"><span class="adi-halo adi-halo-a"></span>…</div></div>
 *     <div class="adi-cut"><div class="adi-rise"><div class="adi-depth"><div class="adi-fig">
 *       <img class="adi-rim" …><img class="adi-still" …>
 *     </div></div></div></div>
 *   </figure>
 *
 * What this adds
 *  · the film: AlphaVideo replaces the still with the moving, transparent figure once its first frame
 *    is drawn, and only plays while the portrait is on screen
 *  · depth on scroll (scrub: 1): she drifts up and grows 7% from her feet as the section passes,
 *    while the light behind her drifts the other way — two layers moving apart reads as distance
 *  · depth on the cursor (mouse only): figure, light and panel shift by different amounts
 *  · the breathing light is CSS (compositor only); here it is just paused while she is off screen
 *
 * Each moving layer has its own wrapper, so the CSS arrival (.adi-rise), the scroll travel (.adi-fig)
 * and the cursor shift (.adi-depth) never write to the same transform.
 *
 * @param {HTMLElement} el   the figure
 * @returns {() => void} cleanup
 */
import { AlphaVideo } from './AlphaVideo.js?v=56d4fe87';

export function PortraitScene(el) {
  const { gsap, ScrollTrigger } = window;
  const fig = el.querySelector('.adi-fig');
  const depth = el.querySelector('.adi-depth');
  const glow = el.querySelector('.adi-glow-in');
  const panel = el.querySelector('.clip .plx');
  if (!fig) return () => {};

  const tweens = [];
  const triggers = [];

  // --- Scroll depth: figure up and larger, light the other way ---
  tweens.push(gsap.fromTo(fig,
    { yPercent: 5, scale: 1 },
    { yPercent: -4, scale: 1.07, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1 } }));
  if (glow) {
    tweens.push(gsap.fromTo(glow,
      { yPercent: -9, scale: 0.94 },
      { yPercent: 11, scale: 1.08, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1 } }));
  }

  // --- The film: fetched when she is a screen away, playing only while she is on screen ---
  let film = null;
  const src = el.dataset.portraitFilm;
  const start = () => {
    if (!src || film) return;
    film = AlphaVideo(fig, {
      src, className: 'adi-canvas',
      onLive() { fig.classList.add('is-live'); },
      onFail() { fig.classList.remove('is-live'); },        // back to the still
    });
  };
  triggers.push(ScrollTrigger.create({
    trigger: el, start: 'top 200%', end: 'bottom -100%',
    onToggle(self) { if (self.isActive) start(); },
  }));
  triggers.push(ScrollTrigger.create({
    trigger: el, start: 'top 108%', end: 'bottom -8%',
    onToggle(self) {
      el.classList.toggle('is-near', self.isActive);        // also lets the CSS light breathe (motion.css)
      if (self.isActive) { start(); if (film) film.play(); } else if (film) film.pause();
    },
  }));

  // --- Cursor depth (a mouse has a position between clicks; a finger does not, and gets the scroll version) ---
  const mm = gsap.matchMedia();
  mm.add('(hover: hover) and (pointer: fine)', () => {
    const section = el.closest('section') || el;
    const to = (target, prop, duration) => target && gsap.quickTo(target, prop, { duration, ease: 'power3.out' });
    const figX = to(depth, 'x', 0.9), figY = to(depth, 'y', 0.9);
    const glowX = to(glow, 'x', 1.4);
    const panelX = to(panel, 'x', 1.2);
    const onMove = (e) => {
      const r = section.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;      // -0.5 … 0.5 across the section
      const ny = (e.clientY - r.top) / r.height - 0.5;
      figX(nx * 26); figY(ny * 14);
      if (glowX) glowX(nx * -44);
      if (panelX) panelX(nx * -14);
    };
    const onLeave = () => { figX(0); figY(0); if (glowX) glowX(0); if (panelX) panelX(0); };
    section.addEventListener('pointermove', onMove, { passive: true });
    section.addEventListener('pointerleave', onLeave);
    return () => {
      section.removeEventListener('pointermove', onMove);
      section.removeEventListener('pointerleave', onLeave);
      gsap.killTweensOf([depth, glow, panel].filter(Boolean), 'x,y');
      if (depth) gsap.set(depth, { clearProps: 'transform' });
    };
  });

  return () => {
    mm.revert();
    triggers.forEach((t) => t.kill());
    tweens.forEach((t) => { if (t.scrollTrigger) t.scrollTrigger.kill(); t.kill(); });
    if (film) film.destroy();
    fig.classList.remove('is-live');
    el.classList.remove('is-near');
    gsap.set([fig, glow].filter(Boolean), { clearProps: 'transform' });
  };
}
