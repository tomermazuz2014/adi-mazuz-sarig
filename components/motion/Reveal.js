/**
 * Reveal — blocks travel up into place as they scroll into view. Bold on purpose: 72px of travel,
 * and elements that arrive together are staggered so a row of cards reads as one wave.
 *
 * Usage: [data-reveal="up"] or [data-reveal="fade"] (both get the same travel — no faint fades).
 *
 * @returns {() => void} cleanup
 */
export function Reveal(selector = '[data-reveal="up"], [data-reveal="fade"]', { distance = 72 } = {}) {
  const { gsap, ScrollTrigger } = window;
  const els = gsap.utils.toArray(selector);
  if (!els.length) return () => {};

  gsap.set(els, { y: distance, opacity: 0 });
  const triggers = ScrollTrigger.batch(els, {
    start: 'top 92%',
    once: true,
    onEnter: (batch) => gsap.to(batch, {
      y: 0, opacity: 1, duration: 1.2, ease: 'expo.out', stagger: 0.07, overwrite: true,
    }),
  });

  return () => {
    triggers.forEach((t) => t.kill());
    gsap.killTweensOf(els);
    gsap.set(els, { clearProps: 'transform,opacity' });
  };
}
