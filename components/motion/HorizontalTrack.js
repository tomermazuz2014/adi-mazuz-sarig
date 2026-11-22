/**
 * HorizontalTrack — a section locks to the screen while the page is scrolled, and its cards travel
 * sideways instead (pin + scrub: 1). Each card comes to the centre in turn; the others stand back,
 * smaller and dimmed. On touch the cards also swing in 3D as they pass, with a band of light crossing
 * each one (a cover-flow), because there is no cursor to tilt them.
 *
 * Usage:   <section>… <div data-htrack> <article>…</article> × n </div> …</section>
 *          While this is active the section gets `is-pinned-h` and the track `is-htrack`
 *          (layout for both is in motion.css). Without the motion layer the same markup is a normal grid.
 *
 * Direction follows the text direction: on this RTL page the first card is on the right and the
 * track travels to the right, so the next card arrives from the left.
 *
 * All positions are measured, never assumed, and measured again on every ScrollTrigger refresh
 * (resize, rotation, fonts arriving).
 *
 * @param {HTMLElement} track
 * @param {{ glares?: Map<HTMLElement, HTMLElement> }} options  glare elements made by Tilt3D, per card
 * @returns {() => void} cleanup
 */
export function HorizontalTrack(track, options = {}) {
  const { gsap, ScrollTrigger } = window;
  const section = track.closest('section') || track.parentElement;
  const cards = [...track.children];
  if (cards.length < 2) return () => {};
  const touch = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const glares = options.glares || new Map();

  section.classList.add('is-pinned-h');
  track.classList.add('is-htrack');

  // A small "02 / 04" and a hairline under the track.
  const meter = document.createElement('div');
  meter.className = 'ht-meter';
  meter.setAttribute('aria-hidden', 'true');
  meter.innerHTML = '<span class="ht-count" dir="ltr">01 / ' + String(cards.length).padStart(2, '0') + '</span><span class="ht-rail"><span class="ht-fill"></span></span>';
  track.parentElement.appendChild(meter);
  const countEl = meter.querySelector('.ht-count');
  const fillEl = meter.querySelector('.ht-fill');

  // Measured on refresh: where each card's centre is when the track sits at x = 0.
  let centers = [], from = 0, to = 0, vw = window.innerWidth;
  const measure = () => {
    gsap.set(track, { x: 0 });
    vw = document.documentElement.clientWidth;
    centers = cards.map((c) => { const r = c.getBoundingClientRect(); return r.left + r.width / 2; });
    from = vw / 2 - centers[0];                         // x that centres the first card
    to = vw / 2 - centers[centers.length - 1];          // x that centres the last card
  };
  measure();

  if (touch) cards.forEach((card) => { const g = glares.get(card); if (g) gsap.set(g, { opacity: 1 }); });

  let lastIndex = -1;
  const layout = () => {
    const x = Number(gsap.getProperty(track, 'x')) || 0;
    let nearest = 0, best = Infinity;
    cards.forEach((card, i) => {
      // d: −1 at one card-and-a-bit to the left of centre, 0 at centre, +1 to the right.
      const d = gsap.utils.clamp(-1, 1, (centers[i] + x - vw / 2) / (vw * 0.5));
      const a = Math.abs(d);
      if (a < best) { best = a; nearest = i; }
      // One write per card per frame: transform and opacity only, so the compositor does the work.
      const props = { scale: 1 - a * 0.16, opacity: 1 - a * 0.55 };
      if (touch) props.rotationY = -d * 34;             // faces the centre from whichever side it is on
      gsap.set(card, props);
      if (touch && glares.get(card)) gsap.set(glares.get(card), { xPercent: d * 130 });
    });
    if (nearest !== lastIndex) {
      lastIndex = nearest;
      countEl.textContent = String(nearest + 1).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
    }
  };

  const travel = gsap.fromTo(track,
    { x: () => from },
    {
      x: () => to,
      ease: 'none',
      onUpdate: layout,
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => '+=' + Math.round(Math.abs(to - from) * 1.15),   // a little more scroll than travel: unhurried
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onRefreshInit: measure,
        onRefresh: layout,
        onUpdate: (self) => gsap.set(fillEl, { scaleX: self.progress }),
      },
    });
  layout();

  return () => {
    if (travel.scrollTrigger) travel.scrollTrigger.kill(true);
    travel.kill();
    meter.remove();
    section.classList.remove('is-pinned-h');
    track.classList.remove('is-htrack');
    gsap.set([track, ...cards], { clearProps: 'transform,opacity' });
  };
}
