/**
 * MagneticButton — the button leans toward the cursor, its label leans a little further,
 * and both settle back when the cursor leaves. Pressing it gives a small squeeze.
 *
 * Usage:   <a class="btn" data-magnetic href="#contact">לתיאום פגישה</a>
 * Options: data-magnetic="0.35"   how far the button follows the cursor (fraction of the offset)
 *
 * Only mounts for a real mouse ((hover: hover) and (pointer: fine)): on touch there is no cursor
 * to follow, and the element keeps its normal CSS press feedback.
 *
 * Why quickTo: the pointer fires many events per frame. quickTo reuses one tween per property and
 * retargets it, so the motion stays interruptible and carries its momentum instead of restarting.
 *
 * @param {HTMLElement} el
 * @returns {() => void} cleanup
 */
export function MagneticButton(el, options = {}) {
  const { gsap } = window;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (!fine.matches) return () => {};

  const strength = Number(options.strength ?? (el.dataset.magnetic || 0.35));
  const labelExtra = options.labelExtra ?? 0.45;      // the label travels this much further than the button

  // The label needs its own box to move independently of the button.
  const label = document.createElement('span');
  label.className = 'mag-label';
  while (el.firstChild) label.appendChild(el.firstChild);
  el.appendChild(label);
  el.classList.add('is-magnetic');

  const follow = { duration: 0.6, ease: 'expo.out' };
  const xTo = gsap.quickTo(el, 'x', follow);
  const yTo = gsap.quickTo(el, 'y', follow);
  const lxTo = gsap.quickTo(label, 'x', follow);
  const lyTo = gsap.quickTo(label, 'y', follow);

  // The resting box is captured on enter: measuring a box that is itself moving would feed the
  // motion back into its own input and make the button jitter.
  let rest = null;
  const onEnter = () => {
    const r = el.getBoundingClientRect();
    const x = Number(gsap.getProperty(el, 'x')) || 0;
    const y = Number(gsap.getProperty(el, 'y')) || 0;
    rest = { cx: r.left - x + r.width / 2, cy: r.top - y + r.height / 2 };
  };
  const onMove = (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    if (!rest) onEnter();
    const dx = (e.clientX - rest.cx) * strength;
    const dy = (e.clientY - rest.cy) * strength;
    xTo(dx); yTo(dy);
    lxTo(dx * labelExtra); lyTo(dy * labelExtra);
  };
  const onLeave = () => {
    rest = null;
    xTo(0); yTo(0); lxTo(0); lyTo(0);
    gsap.to(el, { scale: 1, duration: 0.3, ease: 'expo.out', overwrite: 'auto' });
  };
  const onDown = () => gsap.to(el, { scale: 0.97, duration: 0.16, ease: 'power2.out', overwrite: 'auto' });
  const onUp = () => gsap.to(el, { scale: 1, duration: 0.3, ease: 'expo.out', overwrite: 'auto' });

  el.addEventListener('pointerenter', onEnter);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointerup', onUp);

  return () => {
    el.removeEventListener('pointerenter', onEnter);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointerup', onUp);
    gsap.killTweensOf([el, label]);
    gsap.set([el, label], { clearProps: 'transform' });
    while (label.firstChild) el.insertBefore(label.firstChild, label);
    label.remove();
    el.classList.remove('is-magnetic');
  };
}
