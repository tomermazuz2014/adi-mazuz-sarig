# Adi Mazuz Sarig — Interior Design

Landing page preview for the Adi Mazuz Sarig interior design studio.

Plain static site: `index.html`, `assets/site.css`, `assets/site.js` and images. No build step.

- Hebrew (RTL) with English headings. Headings: Bodoni Moda (Google Fonts). Hebrew and labels: Ploni (licensed font files in `assets/`).
- Text in [square brackets] and the abstract material compositions are placeholders until the studio's own photos and details arrive.
- The hero scene is an AI-generated image (Kling), not a photograph of a studio project.
- `noindex` is set while the page is a draft.

## Motion layer

`components/motion/` holds the reusable motion primitives. They are plain ES modules (no framework, no build), driven by GSAP + ScrollTrigger and Lenis, which are vendored in `assets/vendor/`. `index.js` is the entry point, loaded once from `index.html`; it starts smooth scroll and mounts every component it finds on the page.

| File | What it does | How to use it |
| --- | --- | --- |
| `SmoothScroll.js` | Lenis smooth scrolling, driven by GSAP's ticker and kept in step with ScrollTrigger. | Global. |
| `HeroScene.js` | Hero: drifting light halos, floating sign, sheen loop, scrubbed exit. | Mounts on `.hero`. |
| `Marquee.js` | Kinetic type: endless line; scroll velocity speeds it up, reverses it and skews it. | `data-marquee="38"` (seconds per loop) and `data-marquee-dir="1"` or `"-1"` on a track of two identical halves. |
| `RevealText.js` | Text rises line by line out of a mask. | `data-reveal-text` on a plain-text element. |
| `Reveal.js` | Blocks travel up into place, staggered. | `data-reveal="up"` or `"fade"`. |
| `ScrubText.js` | Words light up with the scroll (`scrub: 1`). | `data-scrub-text` on a paragraph with one `<span>` per word. |
| `ParallaxWrapper.js` | Scroll-scrubbed drift (`scrub: 1`). | `data-parallax="10"` (percent of its height; negative reverses). |
| `Float.js` | Endless hover — the ambient motion. | `data-float="14"` (px each way). |
| `Preloader.js` | 0→100% counter, then a clip-path curtain parts onto the hero. | Markup and the `is-loading` switch are in `index.html`. |
| `AuroraCanvas.js` | WebGL light field that never stops moving and bends toward cursor or finger. | `data-aurora` on a section; the hero mounts its own. |
| `Tilt3D.js` | 3D tilt with a light band: follows the cursor on desktop, the scroll on touch. | `data-tilt`. |
| `HorizontalTrack.js` | Section pins; its cards travel sideways (`scrub: 1`), cover-flow on touch. | `data-htrack` on the row of cards. |
| `MagneticButton.js` | Button and label lean toward the cursor (mouse only). | `data-magnetic`. |
| `CenterActive.js` | Touch replacement for hover: active while in mid-screen. | `data-center-active`. |
| `PressFeedback.js` | `scale(0.95)` on touch/click, springs back. | Every `<a>`, `<button>` and `data-press`. |
| `ScrollProgress.js` | Reading-progress hairline at the top. | Global. |
| `motion.css` | Styles for the above, and the rules that switch off the CSS versions of the same effects while this layer is on. | — |

The whole layer runs only under `prefers-reduced-motion: no-preference`, and does nothing if the libraries fail to load; the page then falls back to the CSS behaviour in `assets/site.css` and `assets/site.js`.

## Before committing

Run `python3 scripts/stamp-version.py`. It puts a content hash (`?v=…`) on the site's own CSS and JS URLs, so browsers never mix a new page with an old cached script.
