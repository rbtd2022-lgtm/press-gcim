/* GCIM Press Office language routing.
   Keeps the selected language across internal navigation and future publications. */
(function (global) {
  'use strict';

  const SUPPORTED_LANGUAGES = Object.freeze(['en', 'ar', 'es', 'zh', 'ru', 'fr', 'uk']);
  const STORAGE_KEY = 'gcimPreferredLanguage';
  const QUERY_PARAM = 'lang';

  const HOME_PAGES = Object.freeze({
    en: 'index.html', ar: 'index-ar.html', es: 'index-es.html', zh: 'index-zh.html',
    ru: 'index-ru.html', fr: 'index-fr.html', uk: 'index-uk.html'
  });

  const SECTION_PAGES = Object.freeze({
    about: Object.freeze({
      en: 'about.html',
      ar: 'about-ar.html',
      es: 'about-es.html',
      zh: 'about-zh.html',
      ru: 'about-ru.html',
      fr: 'about-fr.html',
      uk: 'about-uk.html'
    }),
    media: Object.freeze({
      en: 'media-inquiries.html',
      ar: 'media-inquiries-ar.html',
      es: 'media-inquiries-es.html',
      zh: 'media-inquiries-zh.html',
      ru: 'media-inquiries-ru.html',
      fr: 'media-inquiries-fr.html',
      uk: 'media-inquiries-uk.html'
    })
  });

  function normalizeLanguage(lang, fallback = 'en') {
    return SUPPORTED_LANGUAGES.includes(lang) ? lang : fallback;
  }

  function saveLanguage(lang) {
    lang = normalizeLanguage(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}
    return lang;
  }

  function readLanguage(fallback = 'en') {
    try {
      const urlLang = new URLSearchParams(global.location.search).get(QUERY_PARAM);
      if (SUPPORTED_LANGUAGES.includes(urlLang)) return urlLang;
    } catch (e) {}

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED_LANGUAGES.includes(saved)) return saved;
    } catch (e) {}

    return normalizeLanguage(fallback);
  }

  function sectionUrl(section, lang) {
    const pages = SECTION_PAGES[section];
    lang = normalizeLanguage(lang);
    return pages ? (pages[lang] || pages.en) : '';
  }

  function withLanguage(href, lang) {
    lang = normalizeLanguage(lang);
    if (!href) return href;

    const trimmed = href.trim();

    // Do not alter anchors, email/phone links, scripts, blobs/data URLs or absolute external URLs.
    if (
      trimmed.startsWith('#') ||
      trimmed.startsWith('mailto:') ||
      trimmed.startsWith('tel:') ||
      trimmed.startsWith('javascript:') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:') ||
      /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ) {
      return href;
    }

    const hashIndex = trimmed.indexOf('#');
    const hash = hashIndex >= 0 ? trimmed.slice(hashIndex) : '';
    const withoutHash = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed;

    const queryIndex = withoutHash.indexOf('?');
    const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
    const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '';

    const params = new URLSearchParams(query);
    params.set(QUERY_PARAM, lang);

    return path + '?' + params.toString() + hash;
  }

  function publicationUrl(href, lang) {
    lang = normalizeLanguage(lang);
    if (!href) return href;

    const trimmed = href.trim();
    const match = trimmed.match(/^(.+)-(?:en|ar|es|zh|ru|fr|uk)(\.html)?([?#].*)?$/i);
    if (match) return match[1] + '-' + lang + (match[2] || '.html') + (match[3] || '');

    return withLanguage(href, lang);
  }

  function wireHomeLinks(lang, root = document) {
    lang = normalizeLanguage(lang);
    root.querySelectorAll('a.brand, a[href^="index"]').forEach((link) => {
      if (link.hasAttribute('data-lang-link')) return;
      const href = link.getAttribute('href') || '';
      if (!/^index(?:-(?:ar|es|zh|ru|fr|uk))?\.html(?:[?#].*)?$/i.test(href)) return;
      const hashIndex = href.indexOf('#');
      const hash = hashIndex >= 0 ? href.slice(hashIndex) : '';
      const noHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
      const queryIndex = noHash.indexOf('?');
      const query = queryIndex >= 0 ? noHash.slice(queryIndex + 1) : '';
      const params = new URLSearchParams(query);
      params.delete(QUERY_PARAM);
      const qs = params.toString();
      link.setAttribute('href', HOME_PAGES[lang] + (qs ? '?' + qs : '') + hash);
    });
  }

  function wireSectionLinks(lang, root = document) {
    const aboutUrl = sectionUrl('about', lang);
    const mediaUrl = sectionUrl('media', lang);

    const aboutById = root.getElementById ? root.getElementById('aboutLink') : null;
    if (aboutById) aboutById.setAttribute('href', aboutUrl);

    root.querySelectorAll('a:not([data-lang-link])').forEach((link) => {
      const href = link.getAttribute('href') || '';

      if (/^about(?:-(?:ar|es|zh|ru|fr|uk))?\.html(?:[?#].*)?$/i.test(href)) {
        link.setAttribute('href', aboutUrl);
      }

      if (
        link.classList.contains('media-link') ||
        link.id === 'mediaInquiriesLink' ||
        /^media-inquiries(?:-(?:ar|es|zh|ru|fr|uk))?\.html(?:[?#].*)?$/i.test(href)
      ) {
        link.setAttribute('href', mediaUrl);
      }
    });
  }

  function wirePublicationLinks(lang, root = document) {
    const links = root.querySelectorAll(
      '.news-item a[href]:not([target="_blank"]), a[data-publication-link][href]'
    );

    links.forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;

      // Preserve the original local publication URL so language changes do not accumulate query strings.
      if (!link.dataset.languageBaseHref) {
        link.dataset.languageBaseHref = href;
      }

      link.setAttribute('href', publicationUrl(link.dataset.languageBaseHref, lang));
    });
  }

  function wirePage(lang, root = document) {
    lang = saveLanguage(lang);
    wireHomeLinks(lang, root);
    wireSectionLinks(lang, root);
    wirePublicationLinks(lang, root);
    return lang;
  }

  global.GCIMLanguageRouting = Object.freeze({
    SUPPORTED_LANGUAGES,
    STORAGE_KEY,
    QUERY_PARAM,
    SECTION_PAGES,
    HOME_PAGES,
    normalizeLanguage,
    saveLanguage,
    readLanguage,
    sectionUrl,
    withLanguage,
    publicationUrl,
    wireHomeLinks,
    wireSectionLinks,
    wirePublicationLinks,
    wirePage
  });
})(window);
