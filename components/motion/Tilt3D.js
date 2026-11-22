/**
 * Tilt3D — a card that behaves like a lit object: it tilts in 3D and a band of light crosses it.
 *
 * Usage:   <article data-tilt>…</article>
 *          The band of light is added to the element's `.clip` child if it has one (the image frame),
 *          otherwise to the element itself.
 *
 *  With a mouse  ((hover: hover) and (pointer: fine))
 *    The card leans toward the cursor — perspective(1000px) rotateX/rotateY — and the light band sits
 *    under the cursor. Leaving lets it settle flat.
 *
 *  On touch
 *    There is no cursor, so the scroll does it (scrub: 1): the card starts tipped back and small,
 *    stands up and comes to full size as it reaches the middle of the screen, and the light band
 *    travels across it on the way.
 *
 * A card that lives inside a horizontal track is driven by HorizontalTrack instead on touch (it knows
 * where the card is sideways); pass { scroll: false } to leave the touch behaviour out.
 *
 * @param {HTMLElement} el
 * @returns {{ glare: HTMLElement, destroy: () => void }}
 */
export function Tilt3D(el, options = {}) {
  const { gsap } = window;
  const max = options.max ?? 11;                    // degrees
  const useScroll = options.scroll ?? true;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const surface = el.querySelector('.clip') || el;
  surface.classList.add('tilt-surface');
  const glare = document.createElement('span');
  glare.className = 'tilt-glare';
  glare.setAttribute('aria-hidden', 'true');
  surface.appendChild(glare);

  gsap.set(el, { transformPerspective: 1000, transformOrigin: '50% 50%' });
  const undo = [];

  if (fine) {
    const follow = { duration: 0.55, ease: 'expo.out' };
    const rx = gsap.quickTo(el, 'rotationX', follow);
    const ry = gsap.quickTo(el, 'rotationY', follow);
    const gx = gsap.quickTo(glare, 'xPercent', { duration: 0.4, ease: 'expo.out' });
    const go = gsap.quickTo(glare, 'opacity', { duration: 0.35, ease: 'power2.out' });
    gsap.set(glare, { xPercent: -130, opacity: 0 });

    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;      // 0..1
      const py = (e.clientY - r.top) / r.height;
      ry((px - 0.5) * 2 * max);
      rx((0.5 - py) * 2 * max * 0.8);
      gx((px - 0.5) * 160);                           // the band follows the cursor across the face
      go(1);
    };
    const onLeave = () => { rx(0); ry(0); go(0); };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    undo.push(() => { el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerleave', onLeave); });
  } else if (useScroll) {
    // Stand up and grow while travelling from the bottom of the screen to its middle…
    const stand = gsap.fromTo(el,
      { rotationX: 58, scale: 0.72, transformOrigin: '50% 100%' },
      { rotationX: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 98%', end: 'top 46%', scrub: 1 } });
    // …while the light crosses the face over the whole pass through the screen.
    const sweep = gsap.fromTo(glare,
      { xPercent: -130, opacity: 1 },
      { xPercent: 130, ease: 'none', scrollTrigger: { trigger: el, start: 'top 90%', end: 'bottom 20%', scrub: 1 } });
    undo.push(() => { [stand, sweep].forEach((t) => { if (t.scrollTrigger) t.scrollTrigger.kill(); t.kill(); }); });
  }

  return {
    glare,
    destroy() {
      undo.forEach((fn) => fn());
      gsap.killTweensOf([el, glare]);
      glare.remove();
      surface.classList.remove('tilt-surface');
      gsap.set(el, { clearProps: 'transform' });
    },
  };
}
