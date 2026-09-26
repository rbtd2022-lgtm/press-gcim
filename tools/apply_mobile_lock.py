#!/usr/bin/env python3
"""Keep every public page inside a phone viewport without changing desktop styles."""

from __future__ import annotations

import sys
from pathlib import Path


MARKER = "/* GCIM mobile viewport lock */"
SNIPPET = f"""
    {MARKER}
    @media (max-width:840px) {{
      html, body {{ width:100%; max-width:100%; overflow-x:hidden; }}
      .masthead-inner, .nav, .content, .hero, .featured, .footer-inner,
      .publication-shell, .inquiries-wrap, .about-wrap {{ min-width:0; max-width:100%; }}
      .brand, .brand-copy, .mobile-actions, .nav-links, .news-item, .news-title,
      .publication-title, .publication-body, .resource-item, .resource-title,
      .service-value {{ min-width:0; max-width:100%; }}
      .brand-copy {{ overflow:hidden; }}
      .brand-copy strong {{ white-space:normal; overflow-wrap:anywhere; }}
      .publication-title, .publication-body, .news-title, .news-type, .news-date,
      .hero h1, .inquiries-copy, .contact-value {{ overflow-wrap:anywhere; word-break:normal; }}
      .publication-body .quote-attribution-inline {{ white-space:normal; overflow-wrap:anywhere; }}
      .resource-item {{ flex-wrap:wrap; }}
      .resource-title {{ overflow-wrap:anywhere; }}
      img, svg, video, iframe {{ max-width:100%; height:auto; }}
    }}
    @media (max-width:380px) {{
      .masthead-inner {{ padding-left:10px; padding-right:10px; gap:6px; }}
      .brand {{ gap:7px; }}
      .mark {{ width:42px; height:42px; }}
      .brand-copy strong {{ font-size:16px; line-height:1.1; }}
      .brand-copy span {{ font-size:9px; letter-spacing:.08em; }}
      .mobile-actions {{ gap:5px; }}
      .mobile-lang {{ min-width:52px; width:52px; padding-left:5px; padding-right:5px; }}
      .menu-toggle {{ width:38px; height:38px; }}
      .content, .hero, .featured, .publication-shell, .inquiries-wrap {{ padding-left:14px; padding-right:14px; }}
    }}
"""


def apply(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if MARKER in text:
        return False
    if "</style>" not in text:
        raise RuntimeError(f"No style block found: {path}")
    updated = text.replace("</style>", SNIPPET + "\n  </style>", 1)
    path.write_text(updated, encoding="utf-8")
    return True


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    targets = [root / "index.html", root / "publication.html", root / "404.html"]
    targets += sorted(root.glob("about*.html"))
    targets += sorted(root.glob("media-inquiries*.html"))
    changed = 0
    for path in targets:
        if path.exists() and apply(path):
            changed += 1
    print(f"mobile viewport lock: updated {changed} base pages")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
