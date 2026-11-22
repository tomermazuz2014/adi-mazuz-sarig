/**
 * ScrollProgress — a hairline across the top of the window that fills as the page is read.
 * Scrubbed, so it is always exactly where the scroll is.
 *
 * Creates its own element; nothing to add to the markup. Grows from the right (the page is RTL).
 *
 * @returns {() => void} cleanup
 */
export function ScrollProgress() {
  const { gsap } = window;
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  const tween = gsap.fromTo(bar, { scaleX: 0 }, {
    scaleX: 1, ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 0.4 },
  });

  return () => {
    if (tween.scrollTrigger) tween.scrollTrigger.kill();
    tween.kill();
    bar.remove();
  };
}
