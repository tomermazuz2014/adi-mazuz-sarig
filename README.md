# Adi Mazuz Sarig — Interior Design

Landing page preview for the Adi Mazuz Sarig interior design studio.

Plain static site: `index.html`, `assets/site.css`, `assets/site.js` and images. No build step.

- Hebrew (RTL) with English headings. Headings: Bodoni Moda (Google Fonts). Hebrew and labels: Ploni (licensed font files in `assets/`).
- Text in [square brackets] and the abstract material compositions are placeholders until the studio's own photos and details arrive.
- The hero scene is an AI-generated image (Kling), not a photograph of a studio project.
- `noindex` is set while the page is a draft.

## Motion layer

`components/motion/` holds the reusable motion primitives. They are plain ES modules (no framework, no build), driven by GSAP + ScrollTrigger and Lenis, which are vendored in `assets/vendor/`.

| File | What it does | How to use it |
| --- | --- | --- |
| `index.js` | Entry point, loaded once from `index.html`. Starts smooth scroll and mounts every component found on the page. | — |
| `SmoothScroll.js` | Lenis smooth scrolling, driven by GSAP's ticker and kept in step with ScrollTrigger. | Global, nothing to add. |
| `RevealText.js` | Text rises line by line out of a mask when it scrolls into view. | Add `data-reveal-text` to a plain-text element. |
| `MagneticButton.js` | Button and label lean toward the cursor (mouse only). | Add `data-magnetic` to a link or button. |
| `ParallaxWrapper.js` | Scroll-scrubbed drift for an element inside a clipping frame. | Add `data-parallax="3.5"` (percent of its height). |
| `motion.css` | Styles for the above, and the rules that switch off the CSS versions of the same effects while this layer is on. | — |

The whole layer runs only under `prefers-reduced-motion: no-preference`, and does nothing if the libraries fail to load; the page then falls back to the CSS behaviour in `assets/site.css` and `assets/site.js`.
