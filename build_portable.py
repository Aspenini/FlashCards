#!/usr/bin/env python3
"""
Build a single self-contained HTML file for the FlashCards site.
Inlines: HTML, CSS, bundled sets JS, app JS, jspdf (from CDN), and images.
Does not modify the main project; writes to portable.html in repo root.
"""

import base64
import re
import sys
import urllib.request
from pathlib import Path

# Fix Windows console encoding
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Project root = directory containing this script
ROOT = Path(__file__).resolve().parent
OUTPUT_FILE = ROOT / "portable.html"

JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"


def read_text(path: Path, encoding: str = "utf-8") -> str:
    with open(path, "r", encoding=encoding) as f:
        return f.read()


def read_binary(path: Path) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def fetch_url(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "FlashCards-Build/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def data_uri(mime: str, data: bytes) -> str:
    b64 = base64.b64encode(data).decode("ascii")
    return f"data:{mime};base64,{b64}"


def main() -> None:
    print("Building portable FlashCards HTML...")

    # Paths (all under ROOT)
    index_path = ROOT / "index.html"
    styles_path = ROOT / "styles.css"
    bundled_js_path = ROOT / "bundled-sets.js"
    app_js_path = ROOT / "app.js"
    img_dir = ROOT / "img"
    logo_path = img_dir / "logo.png"
    icon_path = img_dir / "sandy-bowling-approved.ico"

    if not index_path.is_file():
        print(f"Error: {index_path} not found.", file=sys.stderr)
        sys.exit(1)
    if not styles_path.is_file():
        print(f"Error: {styles_path} not found.", file=sys.stderr)
        sys.exit(1)
    if not bundled_js_path.is_file():
        print(f"Error: {bundled_js_path} not found.", file=sys.stderr)
        sys.exit(1)
    if not app_js_path.is_file():
        print(f"Error: {app_js_path} not found.", file=sys.stderr)
        sys.exit(1)

    html = read_text(index_path)
    css = read_text(styles_path)
    bundled_js = read_text(bundled_js_path)
    app_js = read_text(app_js_path)

    # Fetch jspdf for offline use
    print("  Fetching jspdf from CDN...")
    try:
        jspdf_js = fetch_url(JSPDF_URL).decode("utf-8")
    except Exception as e:
        print(f"  Warning: could not fetch jspdf: {e}. PDF export will require network.", file=sys.stderr)
        jspdf_js = ""

    # Inline images
    logo_uri = ""
    icon_uri = ""
    if logo_path.is_file():
        logo_uri = data_uri("image/png", read_binary(logo_path))
        print("  Inlined img/logo.png")
    if icon_path.is_file():
        icon_uri = data_uri("image/x-icon", read_binary(icon_path))
        print("  Inlined img/sandy-bowling-approved.ico")

    # Replace external resources in HTML

    # 1. Favicon
    if icon_uri:
        html = html.replace(
            'href="img/sandy-bowling-approved.ico"',
            f'href="{icon_uri}"',
            1,
        )

    # 2. Stylesheet -> inline <style>
    html = re.sub(
        r'<link rel="stylesheet" href="styles\.css">',
        f"<style>\n{css}\n</style>",
        html,
        count=1,
    )

    # 3. Logo images (both occurrences)
    if logo_uri:
        html = html.replace('src="img/logo.png"', f'src="{logo_uri}"', 2)

    # 4. Scripts: remove the three script tags and replace with one block
    script_block = ""
    if bundled_js:
        script_block += f"<script>\n{bundled_js}\n</script>\n"
    if jspdf_js:
        script_block += f"<script>\n{jspdf_js}\n</script>\n"
    if app_js:
        script_block += f"<script>\n{app_js}\n</script>\n"

    # Match from first script comment through the last script tag
    scripts_pattern = (
        r"(\s*<!-- Cache-busting:.*?-->.*?"
        r'<script src="app\.js[^"]*"></script>)'
    )
    replacement = (
        "\n    <!-- Portable build: CSS, bundled sets, jspdf, and app inlined -->\n    "
        + script_block.rstrip().replace("\n", "\n    ")
    )

    def repl(_m):
        return replacement

    if not re.search(scripts_pattern, html, re.DOTALL):
        print("Warning: script block pattern did not match; checking fallback.", file=sys.stderr)
        # Fallback: replace each script line
        html = re.sub(r'<script src="bundled-sets\.js[^"]*"></script>', "", html)
        html = re.sub(r'<script src="https://cdnjs\.cloudflare\.com/ajax/libs/jspdf/[^"]*"></script>', "", html)
        html = re.sub(r'<script src="app\.js[^"]*"></script>', repl, html, count=1)
    else:
        html = re.sub(scripts_pattern, repl, html, count=1, flags=re.DOTALL)

    OUTPUT_FILE.write_text(html, encoding="utf-8")
    print(f"Wrote {OUTPUT_FILE} ({len(html):,} bytes)")
    print("Done.")


if __name__ == "__main__":
    main()
