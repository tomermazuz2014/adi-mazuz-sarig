/**
 * Motion layer entry — the site's "layout" for motion. Loaded once from index.html.
 *
 *   Global
 *     Preloader         0→100% counter, then a clip-path curtain parts onto the hero
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
 *     Marquee           [data-marquee="38"]           kinetic type: endless, sped up, reversed and skewed by scroll velocity
 *     MagneticButton    [data-magnetic]               cursor-following button (mouse only)
 *     Tilt3D            [data-tilt]                   3D tilt + light band: cursor on desktop, scroll on touch
 *     HorizontalTrack   [data-htrack]                 section pins, cards travel sideways (scrub: 1)
 *     AuroraCanvas      [data-aurora]                 live WebGL light field that reacts to cursor and finger
 *     CenterActive      [data-center-active]          touch replacement for hover: active in mid-screen
 *
 *   Section
 *     HeroScene         .hero                         zoom-out, aurora, floating sign, sheen loop, scrubbed exit
 *     PortraitScene     [data-portrait]               transparent film of the figure (AlphaVideo), scroll and cursor depth
 *
 * Everything lives inside gsap.matchMedia('(prefers-reduced-motion: no-preference)'):
 * a visitor who asks for reduced motion gets none of this layer, and the page falls back to its
 * plain CSS behaviour. If GSAP or Lenis failed to load, this file does nothing.
 */
import { SmoothScroll } from './SmoothScroll.js?v=921c83c2';
import { Preloader } from './Preloader.js?v=921c83c2';
import { RevealText } from './RevealText.js?v=921c83c2';
import { Reveal } from './Reveal.js?v=921c83c2';
import { ScrubText } from './ScrubText.js?v=921c83c2';
import { ParallaxWrapper } from './ParallaxWrapper.js?v=921c83c2';
import { Float } from './Float.js?v=921c83c2';
import { Marquee } from './Marquee.js?v=921c83c2';
import { MagneticButton } from './MagneticButton.js?v=921c83c2';
import { Tilt3D } from './Tilt3D.js?v=921c83c2';
import { HorizontalTrack } from './HorizontalTrack.js?v=921c83c2';
import { AuroraCanvas } from './AuroraCanvas.js?v=921c83c2';
import { CenterActive } from './CenterActive.js?v=921c83c2';
import { PressFeedback } from './PressFeedback.js?v=921c83c2';
import { ScrollProgress } from './ScrollProgress.js?v=921c83c2';
import { HeroScene } from './HeroScene.js?v=921c83c2';
import { PortraitScene } from './PortraitScene.js?v=921c83c2';

const { gsap, ScrollTrigger, Lenis } = window;

if (gsap && ScrollTrigger && Lenis) {
  gsap.registerPlugin(ScrollTrigger);
  // Phone browsers resize the window when the address bar slides away; re-measuring a pinned section
  // every time that happens makes it jump.
  ScrollTrigger.config({ ignoreMobileResize: true });

  const root = document.documentElement;
  const all = (sel) => [...document.querySelectorAll(sel)];
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // Tells the stylesheet this layer is in charge, so the CSS versions of the same effects stand down
    // (see motion.css) and nothing is animated twice.
    root.classList.add('motion-on');

    const smooth = SmoothScroll();
    const heroEl = document.querySelector('.hero');
    const hero = heroEl ? HeroScene(heroEl) : { play() {}, destroy() {} };

    // The page stays put while the curtain is closed.
    smooth.lenis.stop();
    const stopPreloader = Preloader({
      onOpen() { smooth.lenis.start(); hero.play(); },
    });

    // 3D cards. Cards inside a horizontal track get their touch behaviour from the track instead.
    const tilts = all('[data-tilt]').map((el) => ({ el, tilt: Tilt3D(el, { scroll: !el.closest('[data-htrack]') }) }));
    const glares = new Map(tilts.map(({ el, tilt }) => [el, tilt.glare]));

    const cleanups = [
      stopPreloader,
      () => hero.destroy(),
      // The pinned track is created before anything below it, so every later trigger is measured
      // with the extra scroll length it adds.
      ...all('[data-htrack]').map((el) => HorizontalTrack(el, { glares })),
      () => tilts.forEach(({ tilt }) => tilt.destroy()),
      ...all('[data-portrait]').map((el) => PortraitScene(el)),
      ...all('[data-aurora]').map((el) => { el.classList.add('has-aurora'); return AuroraCanvas(el, { mode: 'surface' }); }),
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

    // Images, fonts and the hero film change the page height after first layout; measure again once they are in.
    const refresh = () => { ScrollTrigger.sort(); ScrollTrigger.refresh(); };
    window.addEventListener('load', refresh, { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

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
