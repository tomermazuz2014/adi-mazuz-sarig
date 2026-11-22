/**
 * ScrubText — a statement lights up and settles word by word, tied to the scroll (scrub: 1).
 * Scroll back up and it dims again: the reader's finger is the playhead.
 *
 * Usage:   <p data-scrub-text><span>Deep</span> <span>walnut.</span> …</p>   one span per word
 *
 * @param {HTMLElement} el
 * @returns {() => void} cleanup
 */
export function ScrubText(el) {
  const { gsap } = window;
  const words = el.querySelectorAll('span');
  if (!words.length) return () => {};

  const tween = gsap.fromTo(words,
    { opacity: 0.12, y: 26 },
    {
      opacity: 1, y: 0,
      ease: 'none',
      stagger: 0.5,
      scrollTrigger: { trigger: el, start: 'top 88%', end: 'bottom 52%', scrub: 1 },
    });

  return () => {
    if (tween.scrollTrigger) tween.scrollTrigger.kill();
    tween.kill();
    gsap.set(words, { clearProps: 'transform,opacity' });
  };
}
