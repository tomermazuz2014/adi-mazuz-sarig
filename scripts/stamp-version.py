#!/usr/bin/env python3
"""Stamp a content hash onto every local stylesheet and script URL.

GitHub Pages lets browsers cache files for ten minutes. Without a version in the URL, a visitor can
get the new index.html together with an old cached module, and the two disagree. This script puts
`?v=<hash>` on the site's own CSS/JS URLs in index.html and on every import in components/motion,
so a changed file always has a new address.

Run from the repository root before committing:   python3 scripts/stamp-version.py
"""
import hashlib, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
strip = lambda text: re.sub(r"\?v=[0-9a-f]{8}", "", text)

files = sorted((root / "components" / "motion").glob("*")) + [root / "assets" / "site.css", root / "assets" / "site.js"]
digest = hashlib.sha1()
for f in files:
    digest.update(strip(f.read_text(encoding="utf-8")).encode("utf-8"))
version = digest.hexdigest()[:8]

index = root / "index.html"
html = strip(index.read_text(encoding="utf-8"))
html, n_html = re.subn(r'((?:href|src)="(?:assets/site\.(?:css|js)|components/motion/(?:motion\.css|index\.js)))"', rf'\1?v={version}"', html)
index.write_text(html, encoding="utf-8")

n_js = 0
for module in sorted((root / "components" / "motion").glob("*.js")):
    js = strip(module.read_text(encoding="utf-8"))
    js, n = re.subn(r"(from '\./[A-Za-z0-9]+\.js)'", rf"\1?v={version}'", js)
    module.write_text(js, encoding="utf-8")
    n_js += n

print(f"version {version}: {n_html} urls in index.html, {n_js} imports in components/motion/*.js")
