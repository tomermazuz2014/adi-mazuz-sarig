/**
 * SmoothScroll — Lenis driven by GSAP's ticker, with ScrollTrigger kept in step.
 *
 * One clock for everything: GSAP's ticker calls lenis.raf(), and every Lenis scroll event tells
 * ScrollTrigger to update. Scrubbed animations and the smoothed scroll position therefore never
 * disagree by a frame.
 *
 * Lenis moves the real scroll position (it does not transform the page), so anything that reads
 * native scroll keeps working: IntersectionObserver reveals, CSS scroll-driven animations,
 * position: sticky, the browser's find-in-page.
 *
 * Touch scrolling is left native (Lenis default), which is what a phone user expects.
 *
 * @returns {{ lenis: object, destroy: () => void }}
 */
export function SmoothScroll({ duration = 1.15 } = {}) {
  const { gsap, ScrollTrigger, Lenis } = window;

  const lenis = new Lenis({
    autoRaf: false,                                              // GSAP's ticker drives it (below)
    duration,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),    // expo.out, same family as the reveals
    smoothWheel: true,
    anchors: true,                                               // #studio, #projects… glide instead of jumping
  });

  lenis.on('scroll', ScrollTrigger.update);

  const tick = (time) => lenis.raf(time * 1000);                 // ticker time is in seconds, Lenis wants ms
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);                                   // no catch-up jumps after a stalled frame

  return {
    lenis,
    destroy() {
      gsap.ticker.remove(tick);
      lenis.destroy();
    },
  };
}
