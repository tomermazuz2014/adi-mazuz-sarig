/**
 * Motion layer entry — the site's "layout" for motion. Loaded once from index.html.
 *
 *   Global
 *     SmoothScroll      Lenis + GSAP ticker + ScrollTrigger
 *     PressFeedback     scale(0.95) on every link, button and [data-press]
 *     ScrollProgress    reading-progress hairline at the top of the window
 *
 *   By attribute — add the attribute to an element and it is wired
 *     RevealText        [data-reveal-text]            line-by-line masked text
 *     Reveal            [data-reveal="up" | "fade"]   blocks travel up into place, staggered
 *     ScrubText         [data-scrub-text]             words light up with the scroll (scrub: 1)
 *     ParallaxWrapper   [data-parallax="10"]          scroll-scrubbed drift (scrub: 1)
 *     Float             [data-float="14"]             endless hover (ambient)
 *     Marquee           [data-marquee="34"]           endless type, pushed around by scroll velocity
 *     MagneticButton    [data-magnetic]               cursor-following button (mouse only)
 *     CenterActive      [data-center-active]          touch replacement for hover: active in mid-screen
 *
 *   Section
 *     HeroScene         .hero                         halos, floating sign, sheen loop, scrubbed exit
 *
 * Everything lives inside gsap.matchMedia('(prefers-reduced-motion: no-preference)'):
 * a visitor who asks for reduced motion gets none of this layer, and the page falls back to its
 * plain CSS behaviour. If GSAP or Lenis failed to load, this file does nothing.
 */
import { SmoothScroll } from './SmoothScroll.js?v=dc3a4e70';
import { RevealText } from './RevealText.js?v=dc3a4e70';
import { Reveal } from './Reveal.js?v=dc3a4e70';
import { ScrubText } from './ScrubText.js?v=dc3a4e70';
import { ParallaxWrapper } from './ParallaxWrapper.js?v=dc3a4e70';
import { Float } from './Float.js?v=dc3a4e70';
import { Marquee } from './Marquee.js?v=dc3a4e70';
import { MagneticButton } from './MagneticButton.js?v=dc3a4e70';
import { CenterActive } from './CenterActive.js?v=dc3a4e70';
import { PressFeedback } from './PressFeedback.js?v=dc3a4e70';
import { ScrollProgress } from './ScrollProgress.js?v=dc3a4e70';
import { HeroScene } from './HeroScene.js?v=dc3a4e70';

const { gsap, ScrollTrigger, Lenis } = window;

if (gsap && ScrollTrigger && Lenis) {
  gsap.registerPlugin(ScrollTrigger);
  const root = document.documentElement;
  const all = (sel) => [...document.querySelectorAll(sel)];
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // Tells the stylesheet this layer is in charge, so the CSS versions of the same effects stand down
    // (see motion.css) and nothing is animated twice.
    root.classList.add('motion-on');

    const smooth = SmoothScroll();
    const hero = document.querySelector('.hero');
    const cleanups = [
      hero ? HeroScene(hero) : () => {},
      ...all('[data-marquee]').map((el) => Marquee(el)),
      ...all('[data-reveal-text]').map((el) => RevealText(el)),
      Reveal(),
      ...all('[data-scrub-text]').map((el) => ScrubText(el)),
      ...all('[data-parallax]').map((el) => ParallaxWrapper(el)),
      ...all('[data-float]').map((el) => Float(el)),
      ...all('[data-magnetic]').map((el) => MagneticButton(el)),
      CenterActive(),
      PressFeedback(),
      ScrollProgress(),
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
