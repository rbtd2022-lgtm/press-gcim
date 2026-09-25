#!/usr/bin/env python3
"""Build the seven-language Press Office site and release two verified ZIPs.

Run from an extracted FULL archive: python3 tools/build_site.py
Nothing is released if generation or validation fails.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from copy import deepcopy
from datetime import date
from hashlib import sha256
from pathlib import Path
from urllib.parse import unquote, urlsplit
from zipfile import ZIP_DEFLATED, ZipFile

from lxml import etree, html

LANGS = ("en", "ar", "es", "zh", "ru", "fr", "uk")
HREFLANG = {"en": "en-US", "ar": "ar", "es": "es", "zh": "zh-Hans", "ru": "ru", "fr": "fr", "uk": "uk"}
BASE = "https://press.gcim.eu/"
SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
XHTML_NS = "http://www.w3.org/1999/xhtml"
LISTINGS = {
    "index": None,
    "press-releases": "release",
    "statements": "statement",
    "coordinator-actions": "coordinator-action",
    "perspective": "perspective",
}
CARD_RE = re.compile(r'<article class="news-item"[^>]*>.*?</article>', re.S)
LEGACY_TITLE_ONLY = {"2024-03-18-foreign-nationals-not-political-instruments"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_news(root):
    news = json.loads((root / "content/news.json").read_text(encoding="utf-8"))
    categories = json.loads((root / "content/categories.json").read_text(encoding="utf-8"))["categories"]
    require(set(news["languages"]) == set(LANGS) and len(news["languages"]) == 7, "Expected exactly seven languages")
    ids = set()
    for item in news["publications"]:
        ident = item.get("id", "")
        require(re.fullmatch(r"\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*", ident) is not None, f"Invalid publication ID: {ident}")
        require(ident not in ids, f"Duplicate publication ID: {ident}")
        ids.add(ident)
        require(item.get("category") in categories and item["category"] in LISTINGS.values(), f"Invalid category: {ident}")
        require(item.get("date") == ident[:10], f"Publication date does not match URL: {ident}")
        date.fromisoformat(item["date"])
        translations = item.get("translations") or {}
        require(set(translations) == set(LANGS), f"Seven translations required: {ident}")
        require(all(item.get("translationStatus", {}).get(lang) == "approved" for lang in LANGS), f"Approve all translations: {ident}")
        for lang in LANGS:
            translation = translations[lang]
            require(isinstance(translation.get("title"), str) and translation["title"].strip(), f"Missing title: {ident}/{lang}")
            body = translation.get("body")
            require(isinstance(body, list), f"Invalid article body: {ident}/{lang}")
            require(ident in LEGACY_TITLE_ONLY or any(isinstance(block, dict) and isinstance(block.get("text"), str) and block["text"].strip() for block in body), f"Missing article text: {ident}/{lang}")
    return news, categories


def format_date(iso, lang):
    # Use the existing generator's approved date formatting for every language.
    from generate_static_publications import format_date as existing_format_date
    return existing_format_date(iso, lang)


def make_card(item, categories, lang):
    title = item["translations"][lang]["title"]
    label = item["translations"][lang].get("categoryLabel") or categories[item["category"]][lang]
    search = " ".join(
        [part["translations"][code]["title"] for code in LANGS for part in (item,)]
        + [block["text"] for code in LANGS for block in item["translations"][code]["body"] if isinstance(block, dict) and isinstance(block.get("text"), str)]
    )
    article = etree.Element("article", {"class": "news-item", "data-category": item["category"], "data-categories": item["category"], "data-search": search})
    anchor = etree.SubElement(article, "a", {"data-publication-link": "", "href": f"{item['id']}-{lang}.html"})
    etree.SubElement(anchor, "h2", {"class": "news-title"}).text = title
    meta = etree.SubElement(article, "div", {"class": "news-meta"})
    etree.SubElement(meta, "div", {"class": "news-type"}).text = label
    etree.SubElement(meta, "div", {"class": "news-date"}).text = format_date(item["date"], lang)
    return html.tostring(article, encoding="unicode")


def update_featured(source, item, lang):
    match = re.search(r'<article class="featured"[^>]*>.*?</article>', source, re.S)
    require(match is not None, "Missing featured card")
    doc = html.fragment_fromstring(match.group())
    doc.xpath('.//*[@id="featuredDate"]')[0].text = format_date(item["date"], lang)
    link = doc.xpath('.//*[@id="featuredLink"]')[0]
    link.set("href", f"{item['id']}-{lang}.html")
    link.set("data-featured-id", item["id"])
    title = doc.xpath('.//*[@id="featuredTitle"]')[0]
    for code in LANGS:
        title.set(f"data-{code}", item["translations"][code]["title"])
    title.text = item["translations"][lang]["title"]
    return source[:match.start()] + html.tostring(doc, encoding="unicode") + source[match.end():]


def update_listings(root, news, categories):
    items = {item["id"]: item for item in news["publications"]}
    featured = sorted((item for item in news["publications"] if item.get("featured")), key=lambda item: (item["date"], item["id"]))
    for stem, category in LISTINGS.items():
        for lang in LANGS:
            name = stem + ("" if lang == "en" else f"-{lang}") + ".html"
            path = root / name
            source = path.read_text(encoding="utf-8")
            matches = list(CARD_RE.finditer(source))
            require(matches, f"No existing listing cards: {name}")
            cards = {}
            for match in matches:
                element = html.fragment_fromstring(match.group())
                link = element.xpath('.//a[@data-publication-link]/@href')
                require(len(link) == 1 and link[0].endswith(f"-{lang}.html"), f"Invalid card link: {name}")
                ident = link[0][:-(len(lang) + 6)]
                require(ident in items and ident not in cards, f"Unexpected/duplicate card: {name}/{ident}")
                cards[ident] = match.group()
            expected = {item["id"] for item in news["publications"] if category is None or item["category"] == category}
            # Existing cross-listed articles (for example Coordinator's Actions / Perspective)
            # retain their approved category assignments and markup.
            if category == "perspective":
                expected |= set(cards)
            require(set(cards) <= expected, f"Unexpected category card: {name}")
            missing = expected - set(cards)
            if missing:
                for ident in missing:
                    cards[ident] = make_card(items[ident], categories, lang)
                ordered = sorted(cards, key=lambda ident: (items[ident]["date"], ident), reverse=True)
                first, last = matches[0], matches[-1]
                source = source[:first.start()] + "\n".join(cards[ident] for ident in ordered) + source[last.end():]
            if featured:
                best = featured[-1]
                match = re.search(r'<article class="featured"[^>]*>.*?</article>', source, re.S)
                require(match is not None, f"Missing featured card: {name}")
                fragment = html.fragment_fromstring(match.group())
                current = fragment.xpath('.//*[@id="featuredLink"]/@href')
                marked = fragment.xpath('.//*[@id="featuredLink"]/@data-featured-id')
                if current != [f"{best['id']}-{lang}.html"] or marked != [best["id"]]:
                    source = update_featured(source, best, lang)
            if missing or source != path.read_text(encoding="utf-8"):
                path.write_text(source, encoding="utf-8")


def validate(root, news, public_names):
    names = {path.relative_to(root).as_posix() for path in root.rglob("*") if path.is_file()}
    pages = {name for name in public_names if name.endswith(".html") and name != "404.html"}
    require(len(pages) == (7 * (7 + len(news["publications"]))), "Unexpected number of indexable pages")
    require("robots.txt" in public_names and "sitemap.xml" in public_names and "404.html" in public_names, "Missing site controls")
    robots = (root / "robots.txt").read_text(encoding="utf-8")
    require("Sitemap: " + BASE + "sitemap.xml" in robots and "Disallow: /" not in robots, "Invalid robots.txt")
    for asset in public_names:
        if asset.endswith((".html", ".js", ".css", ".xml", ".txt")):
            source = (root / asset).read_text(encoding="utf-8")
            require("?lang=" not in source and "?category=" not in source, f"Legacy query URL in {asset}")
    schema = {"s": SITEMAP_NS, "x": XHTML_NS}
    sitemap = etree.parse(str(root / "sitemap.xml"))
    entries = sitemap.xpath('/s:urlset/s:url', namespaces=schema)
    require(len(entries) == len(pages), "Sitemap page count mismatch")
    xml_alts = {}
    for entry in entries:
        loc = entry.xpath('string(s:loc)', namespaces=schema)
        require(loc not in xml_alts and loc.startswith(BASE), f"Duplicate or non-HTTPS sitemap URL: {loc}")
        children = entry.xpath('./x:link', namespaces=schema)
        require(len(children) == 8, f"Missing sitemap language links: {loc}")
        xml_alts[loc] = {child.get("hreflang"): child.get("href") for child in children}
        require(len(xml_alts[loc]) == 8, f"Duplicate sitemap languages: {loc}")
    titles, descriptions, page_alts, graph = set(), set(), {}, {}
    href_candidates = set(public_names)
    for name in sorted(pages | {"404.html"}):
        doc = html.parse(str(root / name))
        head = doc.xpath('/html/head')
        require(len(head) == 1, f"Missing head: {name}")
        head = head[0]
        lang = doc.xpath('/html/@lang')
        expected_lang = name[:-5].split("-")[-1]
        if expected_lang not in LANGS:
            expected_lang = "en"
        if name == "404.html":
            require("noindex" in " ".join(head.xpath('./meta[@name="robots"]/@content')).lower(), "404 must be noindex")
            for image in doc.xpath('//img'):
                require(image.get("width") and image.get("height") and image.get("alt") is not None, "404 image dimensions/alt missing")
                require((root / (image.get("src") or "")).is_file(), "404 image missing")
            continue
        require(lang == [expected_lang], f"Incorrect HTML language: {name}")
        if expected_lang == "ar":
            require(doc.xpath('/html/@dir') == ["rtl"], f"Missing Arabic RTL: {name}")
        require("noindex" not in " ".join(head.xpath('./meta[@name="robots"]/@content')).lower(), f"Unexpected noindex: {name}")
        title = head.xpath('./title/text()')
        desc = head.xpath('./meta[@name="description"]/@content')
        require(len(title) == len(desc) == 1 and title[0].strip() and desc[0].strip(), f"Missing title/description: {name}")
        require(title[0] not in titles and desc[0] not in descriptions, f"Duplicate title/description: {name}")
        titles.add(title[0]); descriptions.add(desc[0])
        url = BASE if name == "index.html" else BASE + name
        require(head.xpath('./link[@rel="canonical"]/@href') == [url], f"Non-self canonical: {name}")
        alts = head.xpath('./link[@rel="alternate"][@hreflang]')
        pairs = {a.get("hreflang"): a.get("href") for a in alts}
        require(len(alts) == 8 and set(pairs) == set(HREFLANG.values()) | {"x-default"}, f"Incomplete hreflang: {name}")
        require(pairs[HREFLANG[expected_lang]] == url, f"Missing self hreflang: {name}")
        require(xml_alts.get(url) == pairs, f"Sitemap differs from HTML: {name}")
        require(pairs["x-default"] == pairs["en-US"], f"Wrong x-default: {name}")
        page_alts[url] = pairs
        for key in ("og:title", "og:description", "og:url", "og:locale", "og:image"):
            v = head.xpath(f'./meta[@property="{key}"]/@content')
            require(len(v) == 1 and v[0], f"Missing {key}: {name}")
            if key == "og:url":require(v == [url], f"Wrong OG URL: {name}")
        for key in ("twitter:title", "twitter:description", "twitter:card"):
            require(len(head.xpath(f'./meta[@name="{key}"]/@content')) == 1, f"Missing {key}: {name}")
        require(head.xpath('./meta[@name="description"]/@content') == head.xpath('./meta[@property="og:description"]/@content') == head.xpath('./meta[@name="twitter:description"]/@content'), f"Social descriptions disagree: {name}")
        require(head.xpath('./meta[@property="og:title"]/@content') == head.xpath('./meta[@name="twitter:title"]/@content'), f"Social titles disagree: {name}")
        picture = head.xpath('./meta[@property="og:image"]/@content')[0]
        if picture.startswith(BASE):
            require(picture.removeprefix(BASE) in public_names, f"Social image missing: {name}")
        require(bool(head.xpath('./link[contains(concat(" ",normalize-space(@rel)," ")," icon ")]')), f"Missing favicon: {name}")
        require(bool(doc.xpath('//main//*[normalize-space(text())]')), f"Missing static main content: {name}")
        if re.fullmatch(r"\d{4}-.*\.html", name):
            structured = head.xpath('./script[@type="application/ld+json"]')
            require(len(structured) == 1, f"Missing article JSON-LD: {name}")
            data = json.loads(structured[0].text)
            require(data.get("@type") in ("Article", "NewsArticle") and data.get("mainEntityOfPage", {}).get("@id") == url, f"Invalid article schema: {name}")
            require(data.get("datePublished") == name[:10] and data.get("inLanguage") == expected_lang, f"Incorrect schema date/language: {name}")
            require(data.get("publisher", {}).get("url") == "https://gcim.eu/", f"Incorrect article publisher: {name}")
            require(data.get("headline") == doc.xpath('//h1')[0].text_content().strip(), f"Schema headline differs: {name}")
            if not any(name.startswith(ident + "-") for ident in LEGACY_TITLE_ONLY):
                require(bool(doc.xpath('//article//*[@id="publicationBody"]//*[normalize-space(text())]')), f"Missing static article: {name}")
        elif any(name == stem + ("" if code == "en" else "-" + code) + ".html" for stem in LISTINGS for code in LANGS):
            graph[name] = {unquote(urlsplit(link).path) for link in doc.xpath('//article[@class="news-item"]//a[@data-publication-link]/@href')}
            featured_items = [entry for entry in news["publications"] if entry.get("featured")]
            if featured_items:
                current = max(featured_items, key=lambda entry: (entry["date"], entry["id"]))["id"]
                featured_link = doc.xpath('//*[@id="featuredLink"]')
                require(len(featured_link) == 1 and featured_link[0].get("data-featured-id") == current and featured_link[0].get("href") == f"{current}-{expected_lang}.html", f"Incorrect full featured article link: {name}")
        styles = "\n".join(el.text or "" for el in doc.xpath('//style'))
        preloads = head.xpath('./link[@rel="preload"][@as="font"]')
        for preload in preloads:
            require(preload.get("href") in styles and preload.get("href") in public_names, f"Unused/missing font preload: {name}")
        for face in re.findall(r'@font-face\s*\{[^}]*\}', styles, re.S | re.I):
            require("font-display:swap" in face.replace(" ", "").lower(), f"Blocking web font: {name}")
        for match in re.findall(r'url\(([^)]+)\)', styles, re.I):
            target = match.strip().strip("\"'")
            if not urlsplit(target).scheme and not target.startswith(("data:", "#", "//")):
                require(target in public_names, f"Broken CSS asset: {name}: {target}")
        for image in doc.xpath('//img'):
            require(image.get("width") and image.get("height") and image.get("alt") is not None, f"Image dimensions/alt missing: {name}")
            if image.get("loading") == "lazy":
                require(image.getparent().tag not in ("header",), f"Lazy hero image: {name}")
        for script in head.xpath('./script[not(@type="application/ld+json")]'):
            require(script.get("defer") is not None or script.get("async") is not None or script.get("type") == "module", f"Blocking head JS: {name}")
        main = doc.xpath('//main')
        if main:
            for script in doc.xpath('//script[@src]'):
                require(script.sourceline > main[0].sourceline, f"External script precedes main content: {name}")
        for link in doc.xpath('//*[@href or @src]'):
            value = link.get("href") or link.get("src") or ""
            require("?lang=" not in value and "?category=" not in value, f"Legacy URL: {name}: {value}")
            parsed = urlsplit(value)
            if parsed.scheme or value.startswith(("#", "//", "data:", "mailto:", "tel:")):
                continue
            target = unquote(parsed.path).lstrip("/")
            if target and not target.endswith("/"):
                require(target in href_candidates, f"Broken/public-only link: {name}: {value}")
    require(set(xml_alts) == set(page_alts), "Sitemap missing/extra canonical URL")
    for url, pairs in page_alts.items():
        require(all(target in page_alts and url in page_alts[target].values() for target in pairs.values()), f"Nonreciprocal language link: {url}")
    for item in news["publications"]:
        for lang in LANGS:
            pub = f"{item['id']}-{lang}.html"
            homepage = "index" + ("" if lang == "en" else "-" + lang) + ".html"
            section = {"release": "press-releases", "statement": "statements", "coordinator-action": "coordinator-actions", "perspective": "perspective"}[item["category"]]
            listing = section + ("" if lang == "en" else "-" + lang) + ".html"
            require(pub in graph[homepage] and pub in graph[listing], f"Missing home/category card: {pub}")
    for asset in public_names:
        if asset.endswith(".js"):
            require((root / asset).stat().st_size < 16_384, f"Excessive public JavaScript: {asset}")
    print(f"Verified {len(pages)} indexable pages, {len(news['publications'])} publications, seven languages, sitemap, 15 technical checks")


def package(root, public_names, version, output):
    output.mkdir(parents=True, exist_ok=True)
    paths = {kind: output / f"Website Press Office-v{version}-{kind}.zip" for kind in ("FULL", "PUBLIC")}
    require(not any(path.exists() for path in paths.values()), "Refusing to overwrite existing release ZIPs")
    files = {path.relative_to(root).as_posix(): path for path in root.rglob("*") if path.is_file()}
    require(public_names <= set(files), "Missing PUBLIC file")
    temporaries = {}
    try:
        for kind, dest in paths.items():
            with tempfile.NamedTemporaryFile(prefix=".press-verified-", suffix=".zip", dir=output, delete=False) as temp:
                temporaries[kind] = Path(temp.name)
            selection = sorted(files if kind == "FULL" else public_names)
            with ZipFile(temporaries[kind], "w", compression=ZIP_DEFLATED, compresslevel=6) as archive:
                for name in selection:
                    archive.write(files[name], name)
            with ZipFile(temporaries[kind]) as archive:
                require(archive.testzip() is None, f"Corrupt {kind} ZIP")
        with ZipFile(temporaries["FULL"]) as full, ZipFile(temporaries["PUBLIC"]) as public:
            for name in public.namelist():
                require(sha256(full.read(name)).digest() == sha256(public.read(name)).digest(), f"FULL/PUBLIC mismatch: {name}")
        for kind in ("FULL", "PUBLIC"):
            temporaries[kind].replace(paths[kind])
    finally:
        for temp in temporaries.values():
            temp.unlink(missing_ok=True)
    print("Built " + ", ".join(str(paths[kind]) for kind in ("FULL", "PUBLIC")))


def build(source, output):
    source = source.resolve();output = output.resolve()
    require((source / "content/news.json").is_file() and (source / "tools/generate_static_publications.py").is_file(), "Extract the FULL archive before building")
    config_path = source / "content/build-config.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))
    version = config["version"] + 1
    public_base = set(config["public_files"])
    with tempfile.TemporaryDirectory(prefix="press-office-build-") as folder:
        stage = Path(folder) / "site"
        shutil.copytree(source, stage, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
        news, categories = read_news(stage)
        hashes = {item["id"]: sha256(json.dumps(item, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest() for item in news["publications"]}
        existing = config["publication_hashes"]
        require(all(hashes.get(ident) == digest for ident, digest in existing.items()), "Existing publication data changed; this workflow adds news without silently rewriting approved articles")
        new_ids = set(hashes) - set(existing)
        old_sitemap = (stage / "sitemap.xml").read_bytes()
        preserved = {}
        for ident in existing:
            for lang in LANGS:
                path = stage / f"{ident}-{lang}.html"
                require(path.is_file(), f"Missing approved publication: {path.name}")
                preserved[path.name] = path.read_bytes()
        result = subprocess.run([sys.executable, str(stage / "tools/generate_static_publications.py"), str(stage)], capture_output=True, text=True, check=False)
        require(result.returncode == 0, "Generation failed: " + result.stderr.strip())
        for name, content in preserved.items():
            (stage / name).write_bytes(content)
        if not new_ids:
            (stage / "sitemap.xml").write_bytes(old_sitemap)
        update_listings(stage, news, categories)
        if new_ids:
            (stage / "content/news-data.js").write_text("window.GCIM_NEWS_DATA = " + json.dumps(news, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
        config["version"] = version
        config["publication_hashes"] = hashes
        (stage / "content/build-config.json").write_text(json.dumps(config, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        publications = {f"{item['id']}-{lang}.html" for item in news["publications"] for lang in LANGS}
        public_names = public_base | publications
        validate(stage, news, public_names)
        package(stage, public_names, version, output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path(__file__).resolve().parents[1], help="Extracted FULL archive")
    parser.add_argument("--output", type=Path, help="Destination for the FULL and PUBLIC ZIPs (defaults to the source parent)")
    args = parser.parse_args()
    try:
        build(args.source, args.output or args.source.resolve().parent)
    except (ValueError, OSError, etree.Error, json.JSONDecodeError) as error:
        print(f"BUILD FAILED: {error}", file=sys.stderr)
        sys.exit(1)
