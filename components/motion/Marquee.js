/**
 * Marquee — an endless line of type that never stops, and that the scroll can push around:
 * scrolling down speeds it up, scrolling up throws it into reverse, and it settles back to
 * cruising speed when the scrolling stops.
 *
 * Usage:   <div style="overflow: hidden">
 *            <div data-marquee="34" style="display: flex; width: max-content">   ← seconds per loop
 *              <div>…items…</div>
 *              <div>…the same items again…</div>                                 ← duplicate, for the seam
 *            </div>
 *          </div>
 *
 * The track is two identical halves and travels exactly one half (xPercent -50), so the loop has no seam.
 *
 * @param {HTMLElement} track
 * @returns {() => void} cleanup
 */
export function Marquee(track, options = {}) {
  const { gsap, ScrollTrigger } = window;
  const duration = Number(options.duration ?? (track.dataset.marquee || 30));

  const loop = gsap.to(track, { xPercent: -50, duration, ease: 'none', repeat: -1 });
  loop.totalTime(duration * 200);            // start deep into the loop so it has room to run backwards

  let direction = 1;
  const settle = gsap.delayedCall(0.25, () => {
    gsap.to(loop, { timeScale: direction, duration: 1.4, ease: 'power2.out', overwrite: true });
  }).pause();

  // Scroll velocity (px/s) becomes extra speed; its sign becomes the direction of travel.
  const pusher = ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      const v = self.getVelocity();
      if (Math.abs(v) < 20) return;
      direction = v < 0 ? -1 : 1;
      const boost = Math.min(Math.abs(v) / 350, 7);
      gsap.to(loop, { timeScale: direction * (1 + boost), duration: 0.3, ease: 'power2.out', overwrite: true });
      settle.restart(true);
    },
  });

  // No work while it is off screen.
  const gate = ScrollTrigger.create({
    trigger: track.parentElement || track,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => loop.paused(!self.isActive),
  });

  return () => {
    settle.kill(); pusher.kill(); gate.kill(); loop.kill();
    gsap.set(track, { clearProps: 'transform' });
  };
}
