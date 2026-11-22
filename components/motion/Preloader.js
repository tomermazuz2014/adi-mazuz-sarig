/**
 * Preloader — a short opening: a fast 0→100% counter, then the screen parts like a curtain
 * (two panels wiped away from the centre with clip-path) and the hero is there, all at once.
 *
 * The markup (.preloader) and the `is-loading` class on <html> are in index.html, so the curtain is
 * already closed on the very first paint — this module only plays it. While `is-loading` is set, the
 * hero's own entrance animations are held (see motion.css) so they start when the curtain opens,
 * not behind it.
 *
 * Failsafe: an inline script in index.html removes `is-loading` after 4.5s whatever happens, so the
 * page can never stay covered if this file fails to load.
 *
 * @param {{ onOpen?: () => void, onDone?: () => void }} hooks  onOpen fires as the curtain starts to part
 * @returns {() => void} cleanup
 */
export function Preloader({ onOpen = () => {}, onDone = () => {} } = {}) {
  const { gsap } = window;
  const root = document.documentElement;
  const el = document.querySelector('.preloader');

  // Not covered (reduced motion, or the failsafe already fired): just carry on.
  if (!el || !root.classList.contains('is-loading')) {
    root.classList.remove('is-loading');
    onOpen(); onDone();
    return () => {};
  }

  const num = el.querySelector('.pre-num');
  const line = el.querySelector('.pre-line span');
  const content = el.querySelector('.pre-content');
  const panels = el.querySelectorAll('.pre-panel');
  const count = { v: 0 };

  const tl = gsap.timeline();
  tl.to(count, {
      v: 100, duration: 0.95, ease: 'power2.inOut',
      onUpdate() { if (num) num.textContent = String(Math.round(count.v)); },
    }, 0)
    .to(line, { scaleX: 1, duration: 0.95, ease: 'power2.inOut' }, 0)
    .to(content, { yPercent: -30, opacity: 0, duration: 0.3, ease: 'power3.in' }, 0.92)
    .add(() => {
      // Curtain starts to part: release the hero and let the caller start its zoom-out in the same frame.
      root.classList.remove('is-loading');
      root.classList.add('is-revealing');
      onOpen();
    }, 1.2)
    .to(panels[0], { clipPath: 'inset(0% 100% 0% 0%)', duration: 0.95, ease: 'power4.inOut' }, 1.2)
    .to(panels[1], { clipPath: 'inset(0% 0% 0% 100%)', duration: 0.95, ease: 'power4.inOut' }, 1.2)
    .add(() => { root.classList.remove('is-revealing'); onDone(); });

  return () => {
    tl.kill();
    root.classList.remove('is-loading', 'is-revealing');
  };
}
