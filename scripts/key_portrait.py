"""Cut a green-screen portrait (still or clip) out of its background for the web.

  python3 key_portrait.py <input.mp4|png|jpg> <outdir> [--name adi-about] [--width 816]

Writes into <outdir>:
  <name>.mp4        "stacked alpha" film: the despilled picture on top, its matte underneath, in one
                    ordinary H.264 file. Every browser (iPhone included) can decode it, and a small
                    shader on the page puts the two halves back together as a transparent figure.
                    Only written when the input is a clip.
  <name>.webp       the first frame as a transparent still: shown before the film starts, and instead
                    of it when motion is reduced or the film cannot play.
  <name>-rim.webp   a soft light in the shape of the figure, to sit behind it as a rim glow.
  <name>-check.jpg  the still over walnut, stone and white, for looking at the edges.

Why key here and not in the browser: the matte is computed once from the full-size master, with a
proper unmix of the green out of every half-transparent hair pixel. A live chroma key on the phone
would redo cruder maths on every frame and leave a green fringe in the curls.
"""
import argparse, pathlib, subprocess, sys
import cv2, numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("outdir")
ap.add_argument("--name", default="adi-about")
ap.add_argument("--width", type=int, default=816)      # multiple of 16, so the seam sits on a block edge
ap.add_argument("--crf", type=int, default=20)
a = ap.parse_args()

src = pathlib.Path(a.src); out = pathlib.Path(a.outdir); out.mkdir(parents=True, exist_ok=True)
W = a.width; H = W * 4 // 3
assert W % 16 == 0 and H % 16 == 0, "width must give 16-aligned 3:4 frames (e.g. 816, 720, 624)"
is_clip = src.suffix.lower() in (".mp4", ".mov", ".webm", ".m4v")


def fit(bgr):
    """Centre-crop to 3:4 and scale to W x H."""
    h, w = bgr.shape[:2]
    if w * 4 > h * 3:
        nw = h * 3 // 4; x = (w - nw) // 2; bgr = bgr[:, x:x + nw]
    else:
        nh = w * 4 // 3; y = (h - nh) // 2; bgr = bgr[y:y + nh]
    return cv2.resize(bgr, (W, H), interpolation=cv2.INTER_AREA)


def screen_colour(f):
    """The backdrop colour, measured from the two top corners (never covered by the figure)."""
    k = max(8, W // 24)
    patch = np.concatenate([f[4:k, 4:k].reshape(-1, 3), f[4:k, -k:-4].reshape(-1, 3)])
    return np.median(patch, axis=0)


def key(bgr, screen):
    """-> (colour BGR float 0..1 with the green removed and edges extended, alpha float 0..1)."""
    f = bgr.astype(np.float32) / 255.0
    b, g, r = f[..., 0], f[..., 1], f[..., 2]
    sb, sg, sr = screen
    d = g - np.maximum(r, b)                      # "how green": ~0.9 on the screen, <= 0 on skin, hair, cloth
    d_screen = float(sg - max(sr, sb))
    # A pixel that is part hair, part screen is a blend of the two, so its greenness is its share of screen.
    alpha = 1.0 - np.clip((d - 0.035) / (0.86 * d_screen - 0.035), 0.0, 1.0)
    alpha = cv2.GaussianBlur(alpha, (0, 0), 0.7)  # video stores colour at half resolution; this hides the steps
    alpha = np.clip((alpha - 0.07) / 0.86, 0.0, 1.0)   # close pinholes in the screen, firm up the solid areas

    # Unmix: take the screen's share back out of each edge pixel, leaving the true hair colour.
    a3 = np.maximum(alpha, 0.06)[..., None]
    col = (f - (1.0 - alpha[..., None]) * screen[None, None, :]) / a3
    col = np.clip(col, 0.0, 1.0)
    # Despill: nothing on her is greener than it is red or blue, so any green above that is reflected screen.
    # Blonde hair is the hard case: clamping green to red alone leaves it lemon yellow. Near the backdrop
    # (the outline, and the gaps between curls) the clamp leans on blue as well, which lands on honey.
    hi = np.maximum(col[..., 2], col[..., 0]); lo = np.minimum(col[..., 2], col[..., 0])
    near = np.clip(cv2.GaussianBlur((alpha < 0.6).astype(np.float32), (0, 0), W / 60) * 3.0, 0.0, 1.0)
    k = 0.88 - 0.24 * near
    col[..., 1] = np.minimum(col[..., 1], hi * k + lo * (1.0 - k))

    # Extend the edge colours outwards. Scaling and compression average neighbours, so whatever sits just
    # outside the matte leaks into the fringe; make it more hair, not leftover backdrop.
    w = (alpha > 0.5).astype(np.float32)
    ext = col * w[..., None]; acc = w.copy()
    for s in (3, 9, 27, 81):
        bw = cv2.GaussianBlur(w, (0, 0), s); bc = cv2.GaussianBlur(col * w[..., None], (0, 0), s)
        fill = bc / np.maximum(bw, 1e-4)[..., None]
        m = ((acc < 0.5) & (bw > 0.02)).astype(np.float32)
        ext = ext + fill * m[..., None]; acc = np.maximum(acc, m)
    solid = np.clip((alpha - 0.5) / 0.45, 0, 1)[..., None]     # trust the unmixed colour where the matte is solid
    col = col * solid + ext * (1 - solid)
    return np.clip(col, 0, 1), alpha


def frames(path):
    cap = cv2.VideoCapture(str(path)); fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    def gen():
        while True:
            ok, fr = cap.read()
            if not ok: break
            yield fr
        cap.release()
    return fps, gen()


if is_clip:
    fps, it = frames(src)
else:
    fps, it = 0, iter([cv2.imread(str(src), cv2.IMREAD_COLOR)])

enc = None; first = None; n = 0; screen = None; cover = []
for fr in it:
    fr = fit(fr)
    if screen is None:
        screen = screen_colour(fr.astype(np.float32) / 255.0)
        print("screen colour (BGR 0..1):", np.round(screen, 3))
    col, alpha = key(fr, screen)
    cover.append(float(alpha.mean()))
    if first is None:
        first = (col.copy(), alpha.copy())
    if is_clip:
        if enc is None:
            enc = subprocess.Popen([
                "ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{2 * H}",
                "-r", f"{fps:.6f}", "-i", "-", "-an",
                "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
                "-c:v", "libx264", "-preset", "slow", "-crf", str(a.crf), "-profile:v", "high",
                "-g", str(int(round(fps * 2))), "-colorspace", "bt709", "-color_primaries", "bt709",
                "-color_trc", "bt709", "-color_range", "tv", "-movflags", "+faststart",
                str(out / f"{a.name}.mp4")], stdin=subprocess.PIPE)
        top = (col * 255 + 0.5).astype(np.uint8)
        bot = np.repeat((alpha * 255 + 0.5).astype(np.uint8)[..., None], 3, axis=2)
        enc.stdin.write(np.concatenate([top, bot], axis=0).tobytes())
    n += 1
if enc:
    enc.stdin.close(); enc.wait()
    assert enc.returncode == 0, "ffmpeg failed"

col, alpha = first
rgba = np.dstack([(col * 255 + 0.5).astype(np.uint8), (alpha * 255 + 0.5).astype(np.uint8)])
cv2.imwrite(str(out / f"{a.name}.webp"), rgba, [cv2.IMWRITE_WEBP_QUALITY, 90])

# Rim glow: the figure's own outline, swollen and blurred, in a cool studio white. It is baked into a small
# picture so the page only ever moves and fades it (cheap), instead of blurring live video on every frame.
gw = W // 2; gh = H // 2; pad = gw // 4                      # room for the glow to spread past the frame
m = cv2.resize(alpha, (gw, gh), interpolation=cv2.INTER_AREA)
m = cv2.copyMakeBorder(m, pad, 0, pad, pad, cv2.BORDER_CONSTANT, value=0)
m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
soft = np.clip(cv2.GaussianBlur(m, (0, 0), gw / 36) * 0.8 + cv2.GaussianBlur(m, (0, 0), gw / 11) * 0.45, 0, 1)
tail = gh // 6
soft[-tail:] *= np.linspace(1, 0, tail)[:, None]            # fades out towards the waist, where the frame cuts her
glow = np.zeros((*soft.shape, 4), np.uint8)
glow[..., :3] = (255, 240, 226)                              # BGR: cool white with a breath of blue
glow[..., 3] = (soft * 170).astype(np.uint8)
cv2.imwrite(str(out / f"{a.name}-rim.webp"), glow, [cv2.IMWRITE_WEBP_QUALITY, 82])

# Edge check sheet: the still over the three materials it can meet on the page.
tiles = []
for bg in ((22, 36, 61), (178, 173, 169), (247, 245, 243)):   # walnut, stone, cool white (BGR)
    base = np.full((H, W, 3), bg, np.float32) / 255
    tiles.append(((col * alpha[..., None] + base * (1 - alpha[..., None])) * 255).astype(np.uint8))
cv2.imwrite(str(out / f"{a.name}-check.jpg"), np.concatenate(tiles, axis=1), [cv2.IMWRITE_JPEG_QUALITY, 90])

print(f"frames: {n}  fps: {fps:.3f}  size: {W}x{H}  figure cover: {min(cover):.3f}..{max(cover):.3f}")
for p in sorted(out.glob(f"{a.name}*")):
    print(f"  {p.name:24s} {p.stat().st_size / 1024:8.1f} KB")
