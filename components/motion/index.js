/**
 * Motion layer entry — the site's "layout" for motion. Loaded once from index.html.
 *
 *   SmoothScroll      Lenis + GSAP ticker + ScrollTrigger            (global)
 *   RevealText        [data-reveal-text]                             line-by-line masked text
 *   MagneticButton    [data-magnetic]                                cursor-following button
 *   ParallaxWrapper   [data-parallax]                                scroll-scrubbed drift
 *
 * To use a component anywhere on the page, add its data attribute to the element. Nothing else to wire.
 *
 * Everything lives inside gsap.matchMedia('(prefers-reduced-motion: no-preference)'):
 * a visitor who asks for reduced motion gets none of this layer, and the page falls back to its
 * plain CSS behaviour. If the visitor changes the setting while the page is open, GSAP reverts or
 * re-creates the layer on its own.
 *
 * If GSAP or Lenis failed to load, this file does nothing and the page keeps working without them.
 */
import { SmoothScroll } from './SmoothScroll.js';
import { RevealText } from './RevealText.js';
import { MagneticButton } from './MagneticButton.js';
import { ParallaxWrapper } from './ParallaxWrapper.js';

const { gsap, ScrollTrigger, Lenis } = window;

if (gsap && ScrollTrigger && Lenis) {
  gsap.registerPlugin(ScrollTrigger);
  const root = document.documentElement;
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // Tells the stylesheet this layer is in charge, so the CSS versions of the same effects stand down
    // (see motion.css) and nothing is animated twice.
    root.classList.add('motion-on');

    const smooth = SmoothScroll();
    const cleanups = [
      ...[...document.querySelectorAll('[data-reveal-text]')].map((el) => RevealText(el)),
      ...[...document.querySelectorAll('[data-magnetic]')].map((el) => MagneticButton(el)),
      ...[...document.querySelectorAll('[data-parallax]')].map((el) => ParallaxWrapper(el)),
    ];

    // Images and the hero film change the page height after first layout; measure again once they are in.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh, { once: true });

    // Exposed for debugging in the console: window.__motion.lenis.scrollTo('#contact')
    window.__motion = { lenis: smooth.lenis, gsap, ScrollTrigger };

    return () => {
      window.removeEventListener('load', refresh);
      cleanups.forEach((cleanup) => cleanup());
      smooth.destroy();
      root.classList.remove('motion-on');
      delete window.__motion;
    };
  });
}
