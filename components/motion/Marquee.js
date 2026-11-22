/**
 * Marquee — kinetic type. An endless line that never stops, pushed around by the scroll:
 *   · scrolling speeds it up, and scrolling the other way throws it into reverse
 *   · while the page is moving the line leans (skewX) in proportion to the scroll velocity,
 *     and straightens when the scrolling stops
 * Put two rows with opposite `data-marquee-dir` one above the other and they shear past each other.
 *
 * Usage:   <div style="overflow: hidden">
 *            <div data-marquee="38" data-marquee-dir="1" style="display: flex; width: max-content">
 *              <div>…items…</div>
 *              <div>…the same items again…</div>          ← duplicate, for the seam
 *            </div>
 *          </div>
 *          data-marquee      seconds per loop at cruising speed
 *          data-marquee-dir  1 (default) travels left, -1 travels right
 *
 * The track is two identical halves and travels exactly one half (xPercent -50), so there is no seam.
 * Only transform is animated; the text is rasterised once and moved by the compositor.
 *
 * @param {HTMLElement} track
 * @returns {() => void} cleanup
 */
export function Marquee(track, options = {}) {
  const { gsap, ScrollTrigger } = window;
  const duration = Number(options.duration ?? (track.dataset.marquee || 30));
  const base = Number(options.dir ?? (track.dataset.marqueeDir || 1)) < 0 ? -1 : 1;
  const maxSkew = options.maxSkew ?? 14;                 // degrees

  const loop = gsap.to(track, { xPercent: -50, duration, ease: 'none', repeat: -1 });
  loop.totalTime(duration * 200);                        // start deep into the loop so it has room to run backwards
  loop.timeScale(base);

  const skewTo = gsap.quickTo(track, 'skewX', { duration: 0.45, ease: 'power3.out' });
  let direction = 1;
  const settle = gsap.delayedCall(0.2, () => {
    gsap.to(loop, { timeScale: base * direction, duration: 1.4, ease: 'power2.out', overwrite: true });
    skewTo(0);
  }).pause();

  // Scroll velocity (px/s) becomes extra speed and lean; its sign becomes the direction of travel.
  const pusher = ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      const v = self.getVelocity();
      if (Math.abs(v) < 20) return;
      direction = v < 0 ? -1 : 1;
      const boost = Math.min(Math.abs(v) / 350, 7);
      gsap.to(loop, { timeScale: base * direction * (1 + boost), duration: 0.3, ease: 'power2.out', overwrite: true });
      skewTo(gsap.utils.clamp(-maxSkew, maxSkew, (v / -170) * base));
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
    gsap.killTweensOf(track);
    gsap.set(track, { clearProps: 'transform' });
  };
}
