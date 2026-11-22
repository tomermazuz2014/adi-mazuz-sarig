/**
 * AlphaVideo — plays a film with a transparent background, on every browser including iPhone Safari.
 *
 * Browsers disagree on transparent video (Safari wants HEVC-with-alpha, the others VP9), so the film
 * carries its own matte instead: one ordinary H.264 file, twice as tall as the picture —
 *
 *     ┌──────────┐
 *     │ picture  │   the figure, backdrop already removed and edges cleaned (scripts: key_portrait.py)
 *     ├──────────┤
 *     │  matte   │   white where she is, black where she is not, grey along the hair
 *     └──────────┘
 *
 * — and a two-line shader puts the halves back together on a <canvas>: colour from the top, opacity
 * from the bottom. The matte was computed once, offline, from the full-size master; the phone only
 * samples two textures per pixel, so there is no live chroma key to pay for and no green fringe.
 *
 * Usage (from script):
 *   const film = AlphaVideo(hostElement, { src: 'public/adi-about.mp4', onLive, onFail });
 *   film.play(); film.pause(); film.destroy();
 *
 * The <video> is created here with autoplay, loop, muted and playsinline — the four attributes a
 * phone requires before it will start a film by itself. If it still refuses (iOS Low Power Mode),
 * the first touch anywhere on the page starts it; until then, and if WebGL or the file is missing,
 * nothing is shown and the caller's still picture stays in place.
 *
 * Cost: one texture upload per film frame (not per screen frame — requestVideoFrameCallback), one
 * draw call, canvas at the film's own size. Nothing runs while paused.
 *
 * @param {HTMLElement} host   positioned element; the canvas fills it
 * @param {{ src: string, className?: string, onLive?: () => void, onFail?: () => void }} options
 * @returns {{ play: () => void, pause: () => void, destroy: () => void }}
 */

const VERT = `
attribute vec2 p;
varying vec2 uv;
void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
varying vec2 uv;              // 0..1 across the canvas, y up
uniform sampler2D film;
uniform float texel;          // one film row, in texture units
void main(){
  // Stay a row and a half away from the seam between the halves so neither bleeds into the other.
  float yc = clamp(0.5 + uv.y * 0.5, 0.5 + texel * 1.5, 1.0 - texel * 0.5);   // picture: upper half
  float ya = clamp(uv.y * 0.5, texel * 0.5, 0.5 - texel * 1.5);               // matte: lower half
  vec3 c = texture2D(film, vec2(uv.x, yc)).rgb;
  float a = texture2D(film, vec2(uv.x, ya)).g;
  a = smoothstep(0.03, 0.97, a);          // compression leaves the matte's black a hair above zero
  gl_FragColor = vec4(c * a, a);          // premultiplied, which is what the page compositor expects
}`;

export function AlphaVideo(host, options = {}) {
  const { src, className = 'alpha-video', onLive = () => {}, onFail = () => {} } = options;
  const noop = { play() {}, pause() {}, destroy() {} };
  if (!src) return noop;

  const canvas = document.createElement('canvas');
  canvas.className = className;
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return noop;

  const compile = (type, source) => { const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s); return s; };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return noop;
  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);   // the film is not a power of two
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);                           // film rows run top-down, GL bottom-up
  const uTexel = gl.getUniformLocation(program, 'texel');
  gl.clearColor(0, 0, 0, 0);

  const video = document.createElement('video');
  video.muted = true; video.defaultMuted = true;
  video.loop = true; video.autoplay = true; video.playsInline = true;
  video.setAttribute('muted', ''); video.setAttribute('loop', ''); video.setAttribute('autoplay', '');
  video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', '');
  video.setAttribute('aria-hidden', 'true'); video.tabIndex = -1;
  video.preload = 'auto';
  video.disablePictureInPicture = true;
  video.className = 'alpha-video-src';       // kept in the page (iOS will not decode a detached film) but out of sight

  let live = false, wanted = false, dead = false, vfc = 0, lastTime = -1;

  function draw() {
    if (dead || video.readyState < 2 || !video.videoWidth) return;
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth; canvas.height = video.videoHeight / 2;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uTexel, 1 / video.videoHeight);
    }
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
    } catch (e) { fail(); return; }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!live) { live = true; onLive(); }
  }

  // One upload per decoded film frame where the browser can tell us; otherwise watch the clock on the shared ticker.
  const hasVfc = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
  const onFrame = () => { draw(); if (!dead) vfc = video.requestVideoFrameCallback(onFrame); };
  const onTick = () => { if (!video.paused && video.currentTime !== lastTime) { lastTime = video.currentTime; draw(); } };
  if (hasVfc) vfc = video.requestVideoFrameCallback(onFrame);
  else window.gsap.ticker.add(onTick);

  function fail() {
    if (dead) return;
    const wasLive = live; live = false;
    onFail(wasLive);
  }
  const tryPlay = () => {
    if (dead || !wanted) return;
    const attempt = video.play();
    if (attempt && attempt.catch) attempt.catch(() => {});     // refused: the first touch will ask again
  };
  const onGesture = () => { if (video.paused) tryPlay(); };
  const onLost = (e) => { e.preventDefault(); fail(); };

  video.addEventListener('error', fail);
  video.addEventListener('loadeddata', draw);
  canvas.addEventListener('webglcontextlost', onLost);
  window.addEventListener('touchend', onGesture, { passive: true });
  window.addEventListener('click', onGesture);

  host.appendChild(canvas);
  host.appendChild(video);
  video.src = src;

  return {
    play() { wanted = true; tryPlay(); },
    pause() { wanted = false; if (!video.paused) video.pause(); },
    destroy() {
      dead = true;
      if (hasVfc && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(vfc);
      else if (!hasVfc) window.gsap.ticker.remove(onTick);
      video.removeEventListener('error', fail);
      video.removeEventListener('loadeddata', draw);
      canvas.removeEventListener('webglcontextlost', onLost);
      window.removeEventListener('touchend', onGesture);
      window.removeEventListener('click', onGesture);
      video.pause(); video.removeAttribute('src'); video.load();
      gl.deleteTexture(texture); gl.deleteBuffer(quad); gl.deleteProgram(program);
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      canvas.remove(); video.remove();
    },
  };
}
