/**
 * ParallaxWrapper — the element drifts a few percent of its own height as its frame crosses the
 * screen, so it reads as sitting behind the things around it.
 *
 * Usage:   <div class="frame" style="overflow: hidden">
 *            <img data-parallax="3.5" src="…">     ← taller than the frame by at least 2 × amount
 *          </div>
 * Options: data-parallax="6"               travel, in percent of the element's height, each way
 *          data-parallax-trigger=".frame"  selector of the ancestor that defines "crossing the screen"
 *                                          (default: the parent element)
 *
 * The motion is scrubbed: its progress is the scroll position itself, so it can never run ahead of
 * or behind the page. With SmoothScroll on, the scroll position is already eased, which is all the
 * smoothing this needs.
 *
 * Give the element spare height (height: 110% with top: -5% for amount 3.5) or its edge will show.
 *
 * @param {HTMLElement} el
 * @returns {() => void} cleanup
 */
export function ParallaxWrapper(el, options = {}) {
  const { gsap } = window;
  const amount = Number(options.amount ?? (el.dataset.parallax || 6));
  const triggerSel = options.trigger ?? el.dataset.parallaxTrigger;
  const trigger = (triggerSel && el.closest(triggerSel)) || el.parentElement || el;

  const tween = gsap.fromTo(el,
    { yPercent: -amount },
    {
      yPercent: amount,
      ease: 'none',                                   // linear: the easing belongs to the scroll, not to this
      scrollTrigger: { trigger, start: 'top bottom', end: 'bottom top', scrub: true },
    });

  return () => {
    if (tween.scrollTrigger) tween.scrollTrigger.kill();
    tween.kill();
    gsap.set(el, { clearProps: 'transform' });
  };
}
