/**
 * AuroraCanvas — a live sheet of light drawn on the GPU (WebGL fragment shader): slow ribbons that
 * never stop moving, and that bend toward the cursor or the finger and flare where they are touched.
 *
 * Usage (from script):
 *   AuroraCanvas(hostElement, { mode: 'glow' })      transparent light over whatever is behind (the hero)
 *   AuroraCanvas(hostElement, { mode: 'surface' })   an opaque, coloured field (a section background)
 *
 * Why it is cheap
 *  · one full-screen triangle pair, one shader, no textures
 *  · drawn at a fraction of the screen resolution (the picture is soft anyway) and stretched by CSS
 *  · the render loop only runs while the host is on screen
 *  · 'glow' mode writes premultiplied light with low alpha instead of using mix-blend-mode, so the
 *    browser composites it like any other transparent layer
 *
 * Input: pointermove for mouse and pen, touchstart/touchmove (passive) for fingers — touchmove keeps
 * arriving while the page scrolls under the finger, which pointer events do not.
 *
 * If WebGL is not available the function does nothing and whatever CSS background is there stays.
 *
 * @param {HTMLElement} host   positioned element the canvas should fill
 * @returns {() => void} cleanup
 */

const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;      // 0..1, y up
uniform float uEnergy;      // 0..1, how recently the pointer moved
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
uniform vec3 uBase;
uniform float uOpaque;

// Simplex noise, Ian McEwan / Ashima Arts (MIT).
vec3 permute(vec3 x){ return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main(){
  float aspect = uRes.x / uRes.y;
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 pp = vec2(uPointer.x * aspect, uPointer.y);
  float t = uTime * 0.11;

  // The finger pulls the field toward itself and leaves a flare.
  float d = distance(p, pp);
  float pull = uEnergy * exp(-d * d * 5.5);
  vec2 q = p + (pp - p) * pull * 0.55;

  // Two layers of slow warping, then ribbons running across the warped space.
  q += 0.32 * vec2(snoise(q * 0.85 + vec2(0.0, t)), snoise(q * 0.85 + vec2(5.2, -t * 1.2)));
  float n1 = snoise(q * 1.15 + vec2(t * 1.4, 0.3));
  float n2 = snoise(q * 2.3 - vec2(0.2, t * 1.9));
  float ribbon = sin(q.y * 5.2 + q.x * 1.6 + n1 * 2.6 + t * 5.0) * 0.5 + 0.5;
  ribbon = smoothstep(0.35, 1.0, ribbon) * (0.55 + 0.45 * n2);
  float ribbon2 = sin(q.y * 2.4 - q.x * 2.2 + n2 * 2.0 - t * 3.4) * 0.5 + 0.5;
  ribbon2 = smoothstep(0.55, 1.0, ribbon2) * 0.6;

  vec3 light = mix(uA, uB, smoothstep(-0.7, 0.7, n1)) * ribbon + uC * ribbon2;
  light += mix(uB, uC, 0.5) * pull * 1.6;

  if (uOpaque > 0.5) {
    gl_FragColor = vec4(uBase + light, 1.0);
  } else {
    // Keep the middle of the picture calmer, so whatever sits there (the sign) stays readable.
    light *= mix(0.3, 1.0, smoothstep(0.10, 0.46, distance(uv, vec2(0.5, 0.52))));
    float a = clamp(max(light.r, max(light.g, light.b)) * 0.45, 0.0, 1.0);
    gl_FragColor = vec4(light, a);          // premultiplied: mostly light, little coverage
  }
}`;

const PALETTES = {
  // Over the walnut wall: warm lamp light and the studio's royal blue.
  glow: { a: [0.60, 0.38, 0.18], b: [0.14, 0.24, 0.74], c: [0.26, 0.32, 0.50], base: [0, 0, 0], opaque: 0 },
  // The Contact field: royal blue, with lighter blue and steel light moving through it.
  surface: { a: [0.10, 0.18, 0.52], b: [0.02, 0.06, 0.26], c: [0.34, 0.42, 0.62], base: [0.078, 0.165, 0.50], opaque: 1 },
};

export function AuroraCanvas(host, options = {}) {
  const { gsap, ScrollTrigger } = window;
  const palette = PALETTES[options.mode] || PALETTES.glow;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const scale = options.scale ?? (coarse ? 0.4 : 0.5);

  const canvas = document.createElement('canvas');
  canvas.className = 'aurora-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) return () => {};

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src); gl.compileShader(sh);
    return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  if (!vs || !fs) return () => {};
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return () => {};
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = (name) => gl.getUniformLocation(prog, name);
  const uRes = U('uRes'), uTime = U('uTime'), uPointer = U('uPointer'), uEnergy = U('uEnergy');
  gl.uniform3fv(U('uA'), palette.a); gl.uniform3fv(U('uB'), palette.b); gl.uniform3fv(U('uC'), palette.c);
  gl.uniform3fv(U('uBase'), palette.base); gl.uniform1f(U('uOpaque'), palette.opaque);

  if (options.before && options.before.parentNode === host) host.insertBefore(canvas, options.before);
  else host.insertBefore(canvas, host.firstChild);

  // Size: a fraction of the CSS box, never more than 1.5× device pixels before the fraction is applied.
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(2, Math.round(host.clientWidth * dpr * scale));
    const h = Math.max(2, Math.round(host.clientHeight * dpr * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    }
  };
  resize();
  const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(host);

  // Pointer: target position and an energy that the render loop lets decay.
  const target = { x: 0.5, y: 0.55, energy: 0 };
  const now = { x: 0.5, y: 0.55, energy: 0 };
  const point = (clientX, clientY) => {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    target.x = (clientX - r.left) / r.width;
    target.y = 1 - (clientY - r.top) / r.height;
    target.energy = 1;
  };
  const listenOn = options.listenOn || host;
  const onPointer = (e) => { if (e.pointerType !== 'touch') point(e.clientX, e.clientY); };
  const onTouch = (e) => { const t = e.touches[0]; if (t) point(t.clientX, t.clientY); };
  listenOn.addEventListener('pointermove', onPointer, { passive: true });
  listenOn.addEventListener('touchstart', onTouch, { passive: true });
  listenOn.addEventListener('touchmove', onTouch, { passive: true });

  const t0 = performance.now();
  const render = () => {
    now.x += (target.x - now.x) * 0.08;
    now.y += (target.y - now.y) * 0.08;
    target.energy *= 0.965;                               // the flare fades about a second after the last move
    now.energy += (target.energy - now.energy) * 0.12;
    gl.uniform1f(uTime, (performance.now() - t0) / 1000);
    gl.uniform2f(uPointer, now.x, now.y);
    gl.uniform1f(uEnergy, now.energy);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  let running = false;
  const run = (on) => {
    if (on === running) return;
    running = on;
    if (on) gsap.ticker.add(render); else gsap.ticker.remove(render);
  };
  const gate = ScrollTrigger.create({
    trigger: host, start: 'top bottom', end: 'bottom top',
    onToggle: (self) => run(self.isActive),
  });
  run(gate.isActive);
  render();                                               // one frame straight away, so it is never blank

  return () => {
    run(false); gate.kill();
    if (ro) ro.disconnect();
    listenOn.removeEventListener('pointermove', onPointer);
    listenOn.removeEventListener('touchstart', onTouch);
    listenOn.removeEventListener('touchmove', onTouch);
    canvas.remove();
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  };
}
