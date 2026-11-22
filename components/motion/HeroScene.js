/**
 * HeroScene — everything that keeps the hero alive, in one place.
 *
 *  Ambient (runs by itself, paused while the hero is off screen)
 *   · two large halos of light drift slowly across the wall
 *   · the steel sign floats a few pixels up and down
 *   · every few seconds a band of light crosses the steel
 *
 *  Scrubbed (scrub: 1 — follows the wheel or the finger)
 *   · leaving the hero: the room sinks and swells, a shade comes down, the sign shrinks and lifts
 *     away, the lines at the foot slide off
 *
 * Expects the hero markup hooks: .hero, .h-bg, .h-shade, .h-center, .h-logo, .h-sheen-bar, .h-foot.
 *
 * @param {HTMLElement} hero
 * @returns {() => void} cleanup
 */
export function HeroScene(hero) {
  const { gsap, ScrollTrigger } = window;
  const q = (sel) => hero.querySelector(sel);
  const bg = q('.h-bg'), shade = q('.h-shade'), center = q('.h-center');
  const logo = q('.h-logo'), bar = q('.h-sheen-bar'), foot = q('.h-foot'), light = q('.h-light');
  if (!bg || !center) return () => {};

  const ambient = [];
  const timers = [];

  // ---- Halos: one warm, one in the studio's royal blue, on slow opposing paths.
  const halos = [
    { cls: 'h-halo h-halo-warm', from: { xPercent: -18, yPercent: -10, scale: 0.9 }, to: { xPercent: 22, yPercent: 14, scale: 1.15 }, duration: 9 },
    { cls: 'h-halo h-halo-blue', from: { xPercent: 16, yPercent: 12, scale: 1.1 }, to: { xPercent: -24, yPercent: -12, scale: 0.88 }, duration: 12 },
  ].map((h) => {
    const el = document.createElement('div');
    el.className = h.cls;
    el.setAttribute('aria-hidden', 'true');
    bg.insertBefore(el, light ? light.nextSibling : bg.firstChild);
    ambient.push(gsap.fromTo(el, h.from, { ...h.to, duration: h.duration, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 2.4, delay: 1.2, ease: 'power2.out' });
    return el;
  });

  // ---- The sign floats, and the steel catches the light on a loop.
  // Both elements enter with a CSS animation that keeps hold of their transform; once it has
  // played, hand the element over to GSAP.
  if (logo) {
    timers.push(gsap.delayedCall(2.4, () => {
      logo.style.animation = 'none';
      ambient.push(gsap.fromTo(logo, { y: 9 }, { y: -9, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
    }));
  }
  if (bar) {
    timers.push(gsap.delayedCall(4.5, () => {
      bar.style.animation = 'none';
      ambient.push(gsap.fromTo(bar, { xPercent: -110 }, { xPercent: 110, duration: 1.5, ease: 'power4.inOut', repeat: -1, repeatDelay: 3.8 }));
    }));
  }

  const gate = ScrollTrigger.create({
    trigger: hero, start: 'top bottom', end: 'bottom top',
    onToggle: (self) => ambient.forEach((t) => t.paused(!self.isActive)),
  });

  // ---- Leaving the hero, scrubbed.
  const exit = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1 } });
  exit.to(bg, { yPercent: 16, scale: 1.12, ease: 'none' }, 0)
      .to(center, { y: -130, scale: 0.78, opacity: 0, ease: 'none' }, 0);
  if (shade) exit.to(shade, { opacity: 0.7, ease: 'none' }, 0);
  if (foot) exit.to(foot, { y: -90, opacity: 0, ease: 'none', duration: 0.6 }, 0);

  return () => {
    timers.forEach((t) => t.kill());
    gate.kill();
    if (exit.scrollTrigger) exit.scrollTrigger.kill();
    exit.kill();
    ambient.forEach((t) => t.kill());
    halos.forEach((el) => el.remove());
    if (logo) logo.style.animation = '';
    if (bar) bar.style.animation = '';
    gsap.set([bg, center, shade, foot, logo, bar].filter(Boolean), { clearProps: 'transform,opacity' });
  };
}
