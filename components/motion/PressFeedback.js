/**
 * PressFeedback — everything tappable squeezes to scale(0.95) the moment it is touched or clicked,
 * and springs back on release. One listener for the whole page.
 *
 * Applies to: every <a>, every <button>, and anything marked [data-press] (cards, tiles).
 *
 * @returns {() => void} cleanup
 */
export function PressFeedback(scope = document, selector = 'a, button, [data-press]') {
  const { gsap } = window;
  let pressed = null;

  const down = (e) => {
    const el = e.target.closest && e.target.closest(selector);
    if (!el) return;
    pressed = el;
    gsap.to(el, { scale: 0.95, duration: 0.14, ease: 'power2.out', overwrite: 'auto' });
  };
  const up = () => {
    if (!pressed) return;
    gsap.to(pressed, { scale: 1, duration: 0.5, ease: 'expo.out', overwrite: 'auto' });
    pressed = null;
  };

  scope.addEventListener('pointerdown', down, { passive: true });
  window.addEventListener('pointerup', up, { passive: true });
  window.addEventListener('pointercancel', up, { passive: true });   // a touch that turned into a scroll

  return () => {
    scope.removeEventListener('pointerdown', down);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    if (pressed) gsap.set(pressed, { clearProps: 'scale' });
  };
}
