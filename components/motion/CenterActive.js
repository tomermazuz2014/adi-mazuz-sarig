/**
 * CenterActive — the touch replacement for hover. On a device with no hover, an element becomes
 * "active" by itself while it sits in the middle band of the screen, and goes quiet when it leaves.
 *
 * Usage:   <article data-center-active>…</article>
 *          The element gets the class `is-active`; <html> gets `center-mode` so the stylesheet can dim
 *          the cards that are not in the centre (see motion.css).
 *
 * Does nothing on devices that can hover (the cursor does this job), and skips anything inside a
 * horizontal track: HorizontalTrack lights its own cards, because it knows where they are sideways.
 *
 * @returns {() => void} cleanup
 */
export function CenterActive(selector = '[data-center-active]') {
  const { gsap, ScrollTrigger } = window;
  if (!window.matchMedia('(hover: none)').matches) return () => {};

  const els = gsap.utils.toArray(selector).filter((el) => !el.closest('.is-htrack'));
  if (!els.length) return () => {};

  const root = document.documentElement;
  root.classList.add('center-mode');
  const triggers = els.map((el) => ScrollTrigger.create({
    trigger: el,
    start: 'top 62%',          // the band between 38% and 62% of the screen height
    end: 'bottom 38%',
    toggleClass: { targets: el, className: 'is-active' },
  }));

  return () => {
    triggers.forEach((t) => t.kill());
    root.classList.remove('center-mode');
    els.forEach((el) => el.classList.remove('is-active'));
  };
}
