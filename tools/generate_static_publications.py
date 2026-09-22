#!/usr/bin/env python3
"""Generate one crawlable HTML file for every GCIM publication and language."""

from __future__ import annotations

import json
import re
import sys
from copy import deepcopy
from datetime import date
from pathlib import Path
from urllib.parse import quote

from lxml import etree, html


LANGS = ("en", "ar", "es", "zh", "ru", "fr", "uk")
HREFLANG = {"en": "en-US", "ar": "ar", "es": "es", "zh": "zh-Hans", "ru": "ru", "fr": "fr", "uk": "uk"}
OG_LOCALE = {"en": "en_US", "ar": "ar_SA", "es": "es_ES", "zh": "zh_CN", "ru": "ru_RU", "fr": "fr_FR", "uk": "uk_UA"}
UI = {
    "en": {"service": "Service information", "resources": "Links and attachments", "link": "Link", "attachment": "Attachment"},
    "ar": {"service": "معلومات إدارية", "resources": "الروابط والمرفقات", "link": "رابط", "attachment": "مرفق"},
    "es": {"service": "Información administrativa", "resources": "Enlaces y archivos adjuntos", "link": "Enlace", "attachment": "Archivo adjunto"},
    "zh": {"service": "行政信息", "resources": "链接和附件", "link": "链接", "attachment": "附件"},
    "ru": {"service": "Служебная информация", "resources": "Ссылки и вложения", "link": "Ссылка", "attachment": "Вложение"},
    "fr": {"service": "Informations administratives", "resources": "Liens et pièces jointes", "link": "Lien", "attachment": "Pièce jointe"},
    "uk": {"service": "Службова інформація", "resources": "Посилання та вкладення", "link": "Посилання", "attachment": "Вкладення"},
}
QUOTE_ATTRIBUTIONS = {
    "Папа Франциск", "Pope Francis", "البابا فرنسيس", "Papa Francisco",
    "教皇方济各", "教宗方济各", "Pape François",
}


def first(doc, xpath):
    matches = doc.xpath(xpath)
    if not matches:
        raise RuntimeError(f"Template node not found: {xpath}")
    return matches[0]


def clear(node):
    node.text = None
    for child in list(node):
        node.remove(child)


def format_date(iso_date: str, lang: str) -> str:
    value = date.fromisoformat(iso_date)
    months = {
        "en": ("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"),
        "ar": ("يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"),
        "es": ("enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"),
        "ru": ("января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"),
        "fr": ("janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"),
        "uk": ("січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"),
    }
    if lang == "zh":
        return f"{value.year}年{value.month}月{value.day}日"
    if lang == "es":
        return f"{value.day} de {months[lang][value.month - 1]} de {value.year}"
    if lang == "ru":
        return f"{value.day} {months[lang][value.month - 1]} {value.year} г."
    if lang == "uk":
        return f"{value.day} {months[lang][value.month - 1]} {value.year} р."
    if lang == "ar":
        western = f"{value.day} {months[lang][value.month - 1]} {value.year}"
        return western.translate(str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩"))
    if lang == "fr":
        return f"{value.day} {months[lang][value.month - 1]} {value.year}"
    return f"{months[lang][value.month - 1]} {value.day}, {value.year}"


def localize_chrome(doc, lang):
    for node in doc.xpath('//*[@data-en]'):
        value = node.get(f"data-{lang}") or node.get("data-en")
        if value:
            node.text = value
            for child in list(node):
                node.remove(child)
    email = doc.get_element_by_id("subscribeEmail", None)
    if email is not None:
        email.set("placeholder", email.get(f"data-placeholder-{lang}") or email.get("data-placeholder-en") or "")


def append_body(container, blocks):
    clear(container)
    for index, block in enumerate(blocks or []):
        kind = block.get("type", "paragraph")
        value = block.get("text", "")
        if kind == "paragraph" and value in QUOTE_ATTRIBUTIONS and index and blocks[index - 1].get("type") == "quote":
            previous = container[-1] if len(container) else None
            if previous is not None and previous.tag == "blockquote":
                attribution = etree.SubElement(previous, "span", {"class": "quote-attribution-inline"})
                attribution.text = value
            continue
        if kind == "heading":
            node = etree.SubElement(container, "h2")
            node.text = value
        elif kind == "quote":
            node = etree.SubElement(container, "blockquote")
            node.text = value
        elif kind == "list":
            node = etree.SubElement(container, "ul")
            for item in block.get("items", []):
                li = etree.SubElement(node, "li")
                li.text = item
        else:
            node = etree.SubElement(container, "p")
            if block.get("url"):
                link = etree.SubElement(node, "a", {"href": block["url"], "target": "_blank", "rel": "noopener"})
                link.text = value
            else:
                node.text = value


def append_service(section, heading, container, items, lang):
    heading.text = UI[lang]["service"]
    clear(container)
    entries = items if isinstance(items, list) else []
    if not entries:
        section.set("hidden", "")
    else:
        section.attrib.pop("hidden", None)
    for item in entries:
        row = etree.SubElement(container, "div", {"class": "service-row"})
        label = etree.SubElement(row, "div", {"class": "service-label"})
        label.text = item.get("label", "")
        value = etree.SubElement(row, "div", {"class": "service-value"})
        value.text = item.get("value", "")


def append_resources(section, heading, container, translation, lang):
    heading.text = UI[lang]["resources"]
    clear(container)
    resources = [(x, "link") for x in translation.get("links", [])] + [(x, "attachment") for x in translation.get("attachments", [])]
    if not resources:
        section.set("hidden", "")
    else:
        section.attrib.pop("hidden", None)
    for item, kind in resources:
        anchor = etree.SubElement(container, "a", {"class": "resource-item", "href": item.get("url", "#")})
        if re.match(r"^https?://", anchor.get("href", ""), re.I):
            anchor.set("target", "_blank")
            anchor.set("rel", "noopener")
        title = etree.SubElement(anchor, "span", {"class": "resource-title"})
        title.text = item.get("label") or UI[lang][kind]
        metadata = []
        if kind == "attachment" and item.get("format"):
            metadata.append(item["format"])
        if kind == "attachment" and item.get("size"):
            metadata.append(item["size"])
        if metadata:
            meta = etree.SubElement(anchor, "span", {"class": "resource-meta"})
            meta.text = " · ".join(metadata)


def add_meta(doc, publication, lang, translation):
    head = first(doc, "//head")
    title = translation.get("title", "")
    paragraphs = [
        b.get("text", "") for b in translation.get("body", [])
        if b.get("type") == "paragraph" and b.get("text") and b.get("text") not in QUOTE_ATTRIBUTIONS
    ]
    description = (paragraphs[0] if paragraphs else title)[:180]
    filename = f"{publication['id']}-{lang}.html"
    canonical = f"https://press.gcim.eu/{quote(filename)}"

    first(doc, "//title").text = f"{title} — Global Citizens"
    first(doc, '//meta[@name="description"]').set("content", description)
    first(doc, '//meta[@name="robots"]').set("content", "index, follow")
    first(doc, '//link[@rel="canonical"]').set("href", canonical)

    for node in doc.xpath('//link[@rel="alternate" and @hreflang]'):
        node.getparent().remove(node)
    for node in doc.xpath('//meta[starts-with(@property,"og:") or starts-with(@name,"twitter:")]'):
        node.getparent().remove(node)

    for code in LANGS:
        alternate = etree.SubElement(head, "link", {"rel": "alternate", "hreflang": HREFLANG[code]})
        alternate_path = f"{publication['id']}-{code}.html"
        alternate.set("href", f"https://press.gcim.eu/{quote(alternate_path)}")
    fallback = etree.SubElement(head, "link", {"rel": "alternate", "hreflang": "x-default"})
    default_path = f"{publication['id']}-en.html"
    fallback.set("href", f"https://press.gcim.eu/{quote(default_path)}")

    social_image = "https://press.gcim.eu/assets/social-preview.jpg"
    for prop, content in (
        ("og:type", "article"),
        ("og:site_name", "Global Citizens"),
        ("og:locale", OG_LOCALE[lang]),
        ("og:title", title),
        ("og:description", description),
        ("og:url", canonical),
        ("og:image", social_image),
        ("og:image:secure_url", social_image),
        ("og:image:type", "image/jpeg"),
        ("og:image:width", "1200"),
        ("og:image:height", "630"),
        ("og:image:alt", "Global Citizens Press Office"),
    ):
        etree.SubElement(head, "meta", {"property": prop, "content": content})
    etree.SubElement(head, "meta", {"name": "twitter:card", "content": "summary_large_image"})
    etree.SubElement(head, "meta", {"name": "twitter:title", "content": title})
    etree.SubElement(head, "meta", {"name": "twitter:description", "content": description})
    etree.SubElement(head, "meta", {"name": "twitter:image", "content": social_image})
    etree.SubElement(head, "meta", {"name": "twitter:image:alt", "content": "Global Citizens Press Office"})


def generate(root: Path):
    news = json.loads((root / "content/news.json").read_text(encoding="utf-8"))
    categories = json.loads((root / "content/categories.json").read_text(encoding="utf-8"))["categories"]
    template = html.document_fromstring((root / "publication.html").read_text(encoding="utf-8"))

    for old in root.glob("publication-*.html"):
        old.unlink()

    urls = []
    count = 0
    for publication in news["publications"]:
        for lang in LANGS:
            doc = deepcopy(template)
            translation = publication["translations"][lang]
            doc.set("lang", lang)
            doc.set("dir", "rtl" if lang == "ar" else "ltr")
            doc.set("data-page-language", lang)
            for code in LANGS:
                doc.set(f"data-alternate-{code}", f"{publication['id']}-{code}.html")
            localize_chrome(doc, lang)

            for button in doc.xpath('//*[@data-lang-btn]'):
                active = button.get("data-lang-btn") == lang
                classes = [x for x in (button.get("class") or "").split() if x != "active"]
                if active:
                    classes.append("active")
                if classes:
                    button.set("class", " ".join(classes))
                else:
                    button.attrib.pop("class", None)
                button.set("aria-pressed", "true" if active else "false")
            first(doc, '//*[@id="mobileLang"]//*[@value="%s"]' % lang).set("selected", "selected")

            home = f"index.html?lang={lang}"
            first(doc, '//a[contains(concat(" ",normalize-space(@class)," ")," brand ")]').set("href", home)
            nav_links = doc.xpath('//nav[@id="mobileNav"]//a[starts-with(@href,"index.html")]')
            for link in nav_links:
                href = link.get("href") or "index.html"
                category_match = re.search(r"(?:[?&])category=([^&#]+)", href)
                category = f"&category={category_match.group(1)}" if category_match else ""
                link.set("href", f"index.html?lang={lang}{category}")

            publication_date = first(doc, '//*[@id="publicationDate"]')
            publication_date.text = format_date(publication["date"], lang)
            publication_date.set("datetime", publication["date"])
            label = translation.get("categoryLabel") or categories[publication["category"]][lang]
            first(doc, '//*[@id="publicationCategory"]').text = label
            first(doc, '//*[@id="publicationTitle"]').text = translation.get("title", "")
            append_body(first(doc, '//*[@id="publicationBody"]'), translation.get("body", []))
            append_service(first(doc, '//*[@id="serviceSection"]'), first(doc, '//*[@id="serviceHeading"]'), first(doc, '//*[@id="serviceList"]'), translation.get("serviceInfo", []), lang)
            append_resources(first(doc, '//*[@id="resourcesSection"]'), first(doc, '//*[@id="resourcesHeading"]'), first(doc, '//*[@id="resourcesList"]'), translation, lang)
            add_meta(doc, publication, lang, translation)

            for script in list(doc.xpath('//script[@src="scripts/language-routing.js" or @src="content/news-data.js" or @src="scripts/news-model.js" or @src="scripts/publication-renderer.js"]')):
                script.getparent().remove(script)
            script = etree.SubElement(first(doc, "//body"), "script", {"src": "scripts/static-publication.js"})
            script.tail = "\n"

            output = root / f"{publication['id']}-{lang}.html"
            rendered = "<!DOCTYPE html>\n" + etree.tostring(doc, encoding="unicode", method="html")
            rendered = rendered.replace(' hidden=""', ' hidden')
            output.write_text(rendered, encoding="utf-8")
            urls.append((f"https://press.gcim.eu/{publication['id']}-{lang}.html", publication["date"]))
            count += 1

    static_urls = [
        ("https://press.gcim.eu/", "2026-09-13"),
        *[(f"https://press.gcim.eu/about{'' if lang == 'en' else '-' + lang}", "2026-09-13") for lang in LANGS],
        *[(f"https://press.gcim.eu/media-inquiries{'' if lang == 'en' else '-' + lang}", "2026-09-13") for lang in LANGS],
    ]
    urlset = etree.Element("urlset", nsmap={None: "http://www.sitemaps.org/schemas/sitemap/0.9"})
    for location, modified in static_urls + urls:
        node = etree.SubElement(urlset, "url")
        etree.SubElement(node, "loc").text = location
        etree.SubElement(node, "lastmod").text = modified
    sitemap = etree.tostring(urlset, encoding="UTF-8", xml_declaration=True, pretty_print=True).decode("utf-8")
    (root / "sitemap.xml").write_text(sitemap, encoding="utf-8")
    print(f"Generated {count} static publication pages and {len(static_urls) + len(urls)} sitemap URLs")


if __name__ == "__main__":
    project_root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
    generate(project_root)
