/**
 * Float — an element hovers: a slow rise and fall with a trace of rotation, forever.
 * This is the ambient motion that keeps a section from ever looking frozen.
 *
 * Usage:   <div data-float="14">…</div>      travel in px, each way
 *
 * Uses y (px) and rotation, so it combines cleanly with ParallaxWrapper on the same element,
 * which uses yPercent. Each element gets its own period and phase so a group never moves in step.
 * Paused while its section is off screen.
 *
 * @param {HTMLElement} el
 * @returns {() => void} cleanup
 */
export function Float(el, options = {}) {
  const { gsap, ScrollTrigger } = window;
  const amount = Number(options.amount ?? (el.dataset.float || 12));
  const tilt = options.tilt ?? gsap.utils.random(-1.6, 1.6);

  const tween = gsap.fromTo(el,
    { y: amount, rotation: -tilt },
    {
      y: -amount, rotation: tilt,
      duration: gsap.utils.random(2.6, 4.2),
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      delay: -gsap.utils.random(0, 4),          // negative delay: start somewhere mid-cycle, not all at the bottom
    });

  const gate = ScrollTrigger.create({
    trigger: el.closest('section, header, footer') || el,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => tween.paused(!self.isActive),
  });

  return () => {
    gate.kill(); tween.kill();
    gsap.set(el, { clearProps: 'transform' });
  };
}
