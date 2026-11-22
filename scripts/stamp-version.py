#!/usr/bin/env python3
"""Stamp a content hash onto every local stylesheet and script URL.

GitHub Pages lets browsers cache files for ten minutes. Without a version in the URL, a visitor can
get the new index.html together with an old cached module, and the two disagree. This script puts
`?v=<hash>` on the site's own CSS/JS URLs in index.html and on the imports in components/motion/index.js,
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

entry = root / "components" / "motion" / "index.js"
js = strip(entry.read_text(encoding="utf-8"))
js, n_js = re.subn(r"(from '\./[A-Za-z]+\.js)'", rf"\1?v={version}'", js)
entry.write_text(js, encoding="utf-8")

print(f"version {version}: {n_html} urls in index.html, {n_js} imports in components/motion/index.js")
