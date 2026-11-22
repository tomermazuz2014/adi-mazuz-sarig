/**
 * RevealText — a block of text rises line by line out of a mask as it scrolls into view.
 *
 * Usage:   <h2 data-reveal-text>Planning. Material. Detail.</h2>
 * Options: data-reveal-stagger="0.08"  seconds between lines (0.04–0.08 keeps it one gesture)
 *          data-reveal-delay="1.5"     seconds to wait once triggered (for text that is on screen at load)
 *          data-reveal-start="top 85%" ScrollTrigger start
 *
 * How it works
 *  1. Waits for web fonts, so lines are measured with the real typeface.
 *  2. Splits the text into the lines the browser actually wrapped it into (text-wrap: balance included).
 *  3. Each line gets an overflow-hidden mask; the line inside travels from below (yPercent 110 → 0).
 *  4. When the reveal finishes, the original markup is restored, so the text reflows normally on resize.
 *
 * Accessibility: while split, the element carries the full sentence as aria-label and the line spans
 * are aria-hidden, so a screen reader reads one heading, not four fragments.
 *
 * Limits: for plain-text elements. Inline markup inside the element is flattened while it is split.
 *
 * @param {HTMLElement} el
 * @returns {() => void} cleanup
 */
export function RevealText(el, options = {}) {
  const { gsap, ScrollTrigger } = window;
  const stagger = Number(options.stagger ?? el.dataset.revealStagger ?? 0.08);
  const start = options.start ?? el.dataset.revealStart ?? 'top 85%';
  const duration = options.duration ?? 1.15;
  const delay = Number(options.delay ?? el.dataset.revealDelay ?? 0);

  const originalHTML = el.innerHTML;
  const originalLabel = el.getAttribute('aria-label');
  const sentence = el.textContent.replace(/\s+/g, ' ').trim();
  let tween = null;
  let done = false;
  let dead = false;
  let lastWidth = 0;

  const restore = () => {
    el.innerHTML = originalHTML;
    if (originalLabel === null) el.removeAttribute('aria-label'); else el.setAttribute('aria-label', originalLabel);
    el.style.visibility = '';
  };

  const split = () => {
    // Pass 1: one inline-block per word, so the browser shows us where it breaks the lines.
    el.textContent = '';
    const words = sentence.split(' ').map((word, i, all) => {
      const span = document.createElement('span');
      span.style.display = 'inline-block';
      span.textContent = word;
      el.appendChild(span);
      if (i < all.length - 1) el.appendChild(document.createTextNode(' '));
      return span;
    });
    const lines = [];
    let top = null;
    words.forEach((span) => {
      const y = Math.round(span.offsetTop);
      if (top === null || Math.abs(y - top) > 2) { lines.push([]); top = y; }
      lines[lines.length - 1].push(span.textContent);
    });

    // Pass 2: one mask per line.
    el.textContent = '';
    el.setAttribute('aria-label', sentence);
    return lines.map((lineWords) => {
      const mask = document.createElement('span');
      mask.className = 'rt-line';
      mask.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span');
      inner.className = 'rt-line-in';
      inner.textContent = lineWords.join(' ');
      mask.appendChild(inner);
      el.appendChild(mask);
      return inner;
    });
  };

  const build = () => {
    if (dead || done) return;
    if (tween) { if (tween.scrollTrigger) tween.scrollTrigger.kill(); tween.kill(); }
    lastWidth = el.offsetWidth;
    const inners = split();
    el.style.visibility = '';
    gsap.set(inners, { yPercent: 110 });
    tween = gsap.to(inners, {
      yPercent: 0,
      duration,
      delay,
      ease: 'expo.out',
      stagger,
      scrollTrigger: { trigger: el, start, once: true },
      onComplete() { done = true; restore(); },
    });
  };

  // Lines are measured, so a width change before the reveal means measuring again.
  let resizeTimer = 0;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!done && !dead && tween && tween.progress() === 0 && el.offsetWidth !== lastWidth) build();
    }, 180);
  };
  window.addEventListener('resize', onResize);

  // Hidden until it has been split, so the unsplit heading never flashes; fonts first, with a cap.
  el.style.visibility = 'hidden';
  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fonts, new Promise((resolve) => setTimeout(resolve, 1500))]).then(() => {
    build();
    ScrollTrigger.refresh();
  });

  return () => {
    dead = true;
    clearTimeout(resizeTimer);
    window.removeEventListener('resize', onResize);
    if (tween) { if (tween.scrollTrigger) tween.scrollTrigger.kill(); tween.kill(); }
    restore();
  };
}
