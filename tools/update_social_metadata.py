#!/usr/bin/env python3
"""Apply the shared social-card metadata to GCIM non-generated public pages."""

from __future__ import annotations

import html
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOCIAL_IMAGE = "https://press.gcim.eu/assets/social-preview.jpg"
OG_LOCALES = {"en": "en_US", "ar": "ar_SA", "es": "es_ES", "zh": "zh_CN", "ru": "ru_RU", "fr": "fr_FR", "uk": "uk_UA"}


def attr(source: str, name: str, key: str) -> str:
    match = re.search(rf'<meta\s+{name}="{re.escape(key)}"\s+content="([^"]*)"', source)
    return html.unescape(match.group(1)) if match else ""


def apply(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    language_match = re.search(r'<html\s+lang="([^"]+)"', source)
    language = language_match.group(1) if language_match else "en"
    title_match = re.search(r'<title>(.*?)</title>', source, re.S)
    title = html.unescape(title_match.group(1).strip()) if title_match else "Global Citizens"
    description = attr(source, "name", "description") or "Global Citizens International Movement — Press Office"
    canonical_match = re.search(r'<link\s+rel="canonical"[^>]*href="([^"]+)"', source)
    url = html.unescape(canonical_match.group(1)) if canonical_match else f"https://press.gcim.eu/{path.stem}"
    page_type = "article" if path.name == "publication.html" else "website"

    source = re.sub(
        r'^[ \t]*<meta\s+(?:property="og:[^"]+"|name="twitter:[^"]+")[^>]*>[ \t]*\n?',
        "",
        source,
        flags=re.M,
    )

    esc = lambda value: html.escape(value, quote=True)
    block = "\n".join((
        f'  <meta property="og:type" content="{page_type}">',
        '  <meta property="og:site_name" content="Global Citizens">',
        f'  <meta property="og:locale" content="{OG_LOCALES.get(language, "en_US")}">',
        f'  <meta property="og:title" content="{esc(title)}">',
        f'  <meta property="og:description" content="{esc(description)}">',
        f'  <meta property="og:url" content="{esc(url)}">',
        f'  <meta property="og:image" content="{SOCIAL_IMAGE}">',
        f'  <meta property="og:image:secure_url" content="{SOCIAL_IMAGE}">',
        '  <meta property="og:image:type" content="image/jpeg">',
        '  <meta property="og:image:width" content="1200">',
        '  <meta property="og:image:height" content="630">',
        '  <meta property="og:image:alt" content="Global Citizens Press Office">',
        '  <meta name="twitter:card" content="summary_large_image">',
        f'  <meta name="twitter:title" content="{esc(title)}">',
        f'  <meta name="twitter:description" content="{esc(description)}">',
        f'  <meta name="twitter:image" content="{SOCIAL_IMAGE}">',
        '  <meta name="twitter:image:alt" content="Global Citizens Press Office">',
    ))
    source = source.replace("</head>", block + "\n</head>", 1)
    path.write_text(source, encoding="utf-8")


def main() -> None:
    targets = [ROOT / "index.html", ROOT / "publication.html", ROOT / "404.html"]
    targets.extend(sorted(ROOT.glob("about*.html")))
    targets.extend(sorted(ROOT.glob("media-inquiries*.html")))
    for target in targets:
        apply(target)
    print(f"Updated social metadata in {len(targets)} base pages")


if __name__ == "__main__":
    main()
