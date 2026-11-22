/**
 * CenterActive — the touch replacement for hover. On a device with no hover, an element becomes
 * "active" by itself while it sits in the middle band of the screen, and goes quiet when it leaves.
 *
 * Usage:   <article data-center-active>…</article>
 *          The element gets the class `is-active`; <html> gets `center-mode` so the stylesheet can dim
 *          the cards that are not in the centre (see motion.css).
 *
 * Does nothing on devices that can hover: there, the cursor does this job.
 *
 * @returns {() => void} cleanup
 */
export function CenterActive(selector = '[data-center-active]') {
  const { gsap, ScrollTrigger } = window;
  if (!window.matchMedia('(hover: none)').matches) return () => {};

  const root = document.documentElement;
  root.classList.add('center-mode');
  const triggers = gsap.utils.toArray(selector).map((el) => ScrollTrigger.create({
    trigger: el,
    start: 'top 62%',          // the band between 38% and 62% of the screen height
    end: 'bottom 38%',
    toggleClass: { targets: el, className: 'is-active' },
  }));

  return () => {
    triggers.forEach((t) => t.kill());
    root.classList.remove('center-mode');
    document.querySelectorAll(selector).forEach((el) => el.classList.remove('is-active'));
  };
}
