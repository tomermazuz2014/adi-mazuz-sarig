import { AuroraCanvas } from './AuroraCanvas.js?v=b228d25b';

/**
 * HeroScene — everything that keeps the hero alive, in one place.
 *
 *  Opening (play(), called as the preloader curtain parts)
 *   · the room zooms out from 1.5× to rest
 *
 *  Ambient (runs by itself, paused while the hero is off screen)
 *   · a live aurora of warm and royal-blue light over the wall, drawn on the GPU, that bends toward
 *     the cursor or the finger (AuroraCanvas)
 *   · the steel sign floats a few pixels up and down
 *   · every few seconds a band of light crosses the steel
 *
 *  Scrubbed (scrub: 1 — follows the wheel or the finger)
 *   · leaving the hero: the room sinks and swells, a shade comes down, the sign shrinks and lifts
 *     away, the lines at the foot slide off
 *
 * Expects the hero markup hooks: .hero, .h-bg, .h-wall, .h-shade, .h-center, .h-logo, .h-sheen-bar, .h-foot.
 *
 * @param {HTMLElement} hero
 * @returns {{ play: () => void, destroy: () => void }}
 */
export function HeroScene(hero) {
  const { gsap, ScrollTrigger } = window;
  const q = (sel) => hero.querySelector(sel);
  const bg = q('.h-bg'), wall = q('.h-wall'), shade = q('.h-shade'), center = q('.h-center');
  const logo = q('.h-logo'), bar = q('.h-sheen-bar'), foot = q('.h-foot'), light = q('.h-light');
  if (!bg || !center) return { play() {}, destroy() {} };

  const ambient = [];
  const timers = [];
  let played = false;

  // ---- Live light over the wall. Listens on the whole hero so nav and logo do not block it.
  const stopAurora = AuroraCanvas(bg, { mode: 'glow', before: light ? light.nextSibling : null, listenOn: hero });

  // The room starts zoomed in and waits there for the curtain.
  if (wall) gsap.set(wall, { scale: 1.5 });

  const gate = ScrollTrigger.create({
    trigger: hero, start: 'top bottom', end: 'bottom top',
    onToggle: (self) => ambient.forEach((t) => t.paused(!self.isActive)),
  });

  const play = () => {
    if (played) return;
    played = true;
    if (wall) gsap.to(wall, { scale: 1, duration: 2.4, ease: 'expo.out' });

    // The sign and the sheen enter with a CSS animation that keeps hold of their transform;
    // once it has played, hand the element over to GSAP for the ambient loops.
    if (logo) {
      timers.push(gsap.delayedCall(1.9, () => {
        logo.style.animation = 'none';
        ambient.push(gsap.fromTo(logo, { y: 9 }, { y: -9, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
      }));
    }
    if (bar) {
      timers.push(gsap.delayedCall(3.6, () => {
        bar.style.animation = 'none';
        ambient.push(gsap.fromTo(bar, { xPercent: -110 }, { xPercent: 110, duration: 1.5, ease: 'power4.inOut', repeat: -1, repeatDelay: 3.8 }));
      }));
    }
  };

  // ---- Leaving the hero, scrubbed.
  const exit = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1 } });
  exit.to(bg, { yPercent: 16, scale: 1.12, ease: 'none' }, 0)
      .to(center, { y: -130, scale: 0.78, opacity: 0, ease: 'none' }, 0);
  if (shade) exit.to(shade, { opacity: 0.7, ease: 'none' }, 0);
  if (foot) exit.to(foot, { y: -90, opacity: 0, ease: 'none', duration: 0.6 }, 0);

  return {
    play,
    destroy() {
      timers.forEach((t) => t.kill());
      gate.kill();
      if (exit.scrollTrigger) exit.scrollTrigger.kill();
      exit.kill();
      ambient.forEach((t) => t.kill());
      stopAurora();
      if (logo) logo.style.animation = '';
      if (bar) bar.style.animation = '';
      gsap.killTweensOf(wall);
      gsap.set([bg, wall, center, shade, foot, logo, bar].filter(Boolean), { clearProps: 'transform,opacity' });
    },
  };
}
