/* GCIM Press Office — homepage news loader.
   content/news.json becomes the source for the news archive; Featured is selected only by featured:true.
   If it is empty or cannot be loaded, the existing static homepage content is retained as fallback. */
(function () {
  'use strict';

  const LANGUAGES = ['en', 'ar', 'es', 'zh', 'ru', 'fr', 'uk'];

  function currentLanguage() {
    if (window.GCIMLanguageRouting) {
      return window.GCIMLanguageRouting.readLanguage('en');
    }

    const pageLang = (document.documentElement.lang || '').toLowerCase();
    if (LANGUAGES.includes(pageLang)) return pageLang;

    try {
      const saved = localStorage.getItem('gcimPreferredLanguage');
      if (LANGUAGES.includes(saved)) return saved;
    } catch (e) {}

    return 'en';
  }

  function translation(item, lang) {
    const translations = item && item.translations ? item.translations : {};
    return translations[lang] || translations.en || {};
  }

  function setLocalizedTextAttributes(element, item, field, fallback) {
    if (!element) return;

    LANGUAGES.forEach((lang) => {
      const value = translation(item, lang)[field];
      if (typeof value === 'string' && value.trim()) {
        element.dataset[lang] = value;
      }
    });

    const lang = currentLanguage();
    element.textContent =
      element.dataset[lang] ||
      element.dataset.en ||
      fallback ||
      '';
  }

  function bodyText(item) {
    const values = [];

    LANGUAGES.forEach((lang) => {
      const t = translation(item, lang);
      if (t.title) values.push(t.title);
      if (Array.isArray(t.body)) {
        t.body.forEach((block) => {
          if (typeof block.text === 'string') values.push(block.text);
          if (Array.isArray(block.items)) values.push(...block.items);
        });
      }
    });

    return values.join(' ').replace(/\s+/g, ' ').trim();
  }

  function parseDateValue(value) {
    if (!value) return Number.NEGATIVE_INFINITY;
    const stamp = Date.parse(value.length === 10 ? value + 'T00:00:00Z' : value);
    return Number.isFinite(stamp) ? stamp : Number.NEGATIVE_INFINITY;
  }

  function formatDate(value, lang) {
    if (!value) return '';

    const parsed = new Date(value.length === 10 ? value + 'T00:00:00Z' : value);
    if (Number.isNaN(parsed.getTime())) return value;

    const locales = {
      en: 'en-US',
      ar: 'ar',
      es: 'es-ES',
      zh: 'zh-CN',
      ru: 'ru-RU',
      fr: 'fr-FR',
      uk: 'uk-UA'
    };

    const locale = locales[lang] || 'en-US';
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    }).format(parsed);
  }

  function setLocalizedDateAttributes(element, value) {
    if (!element) return;

    LANGUAGES.forEach((lang) => {
      element.dataset[lang] = formatDate(value, lang);
    });

    const lang = currentLanguage();
    element.textContent = element.dataset[lang] || element.dataset.en || value || '';
  }

  function publicationHref(item, lang) {
    const id = item && item.id ? String(item.id) : '';
    const slug = item && item.slug ? String(item.slug) : '';
    if (id) return encodeURIComponent(id) + '-' + lang + '.html';

    return '404.html';
  }

  function renderNewsItem(item) {
    const lang = currentLanguage();

    const article = document.createElement('article');
    article.className = 'news-item';
    const categories = Array.isArray(item.categories) && item.categories.length
      ? item.categories
      : [item.category || ''];
    article.dataset.category = categories[0] || '';
    article.dataset.categories = categories.join(' ');
    article.dataset.search = bodyText(item);

    const type = document.createElement('div');
    type.className = 'news-type';
    LANGUAGES.forEach((code) => {
      const customLabel = translation(item, code).categoryLabel;
      type.dataset[code] =
        typeof customLabel === 'string' && customLabel.trim()
          ? customLabel
          : getNewsCategoryLabel(item.category, code);
    });
    type.textContent = type.dataset[lang] || type.dataset.en || '';

    const link = document.createElement('a');
    link.href = publicationHref(item, lang);
    link.setAttribute('data-publication-link', '');

    const title = document.createElement('h2');
    title.className = 'news-title';
    setLocalizedTextAttributes(title, item, 'title', '');

    link.appendChild(title);

    const date = document.createElement('div');
    date.className = 'news-date';
    setLocalizedDateAttributes(date, item.date || '');

    const meta = document.createElement('div');
    meta.className = 'news-meta';
    meta.append(type, date);

    article.append(link, meta);
    return article;
  }

  function renderFeatured(item) {
    const lang = currentLanguage();
    const featured = document.getElementById('featuredPublication');
    const date = document.getElementById('featuredDate');
    const link = document.getElementById('featuredLink');
    const title = document.getElementById('featuredTitle');
    if (!featured || !date || !link || !title) return;

    setLocalizedDateAttributes(date, item.date || '');
    setLocalizedTextAttributes(title, item, 'title', '');

    link.href = publicationHref(item, lang);
    link.removeAttribute('target');
    link.removeAttribute('rel');
    link.setAttribute('data-publication-link', '');

  }

  function applyCurrentLanguage() {
    const lang = currentLanguage();

    document.querySelectorAll('[data-en]').forEach((element) => {
      element.textContent = element.dataset[lang] || element.dataset.en;
    });

    if (window.GCIMLanguageRouting) {
      window.GCIMLanguageRouting.wirePage(lang);
    }

    if (typeof window.GCIMRefreshHomeNews === 'function') {
      window.GCIMRefreshHomeNews();
    }
  }

  async function loadHomepageNews() {
    let payload = window.GCIM_NEWS_DATA || null;

    if (!payload) {
      try {
        const response = await fetch('content/news.json', { cache: 'no-store' });
        if (!response.ok) return;
        payload = await response.json();
      } catch (error) {
        return;
      }
    }

    if (!payload || !Array.isArray(payload.publications) || payload.publications.length === 0) {
      return;
    }

    const publications = payload.publications
      .filter((item) =>
        item &&
        (item.id || item.slug) &&
        typeof isNewsCategory === 'function' &&
        isNewsCategory(item.category) &&
        typeof isPublicationReadyForPublic === 'function' &&
        isPublicationReadyForPublic(item)
      )
      .sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date));

    if (publications.length === 0) return;

    const list = document.getElementById('newsList');
    if (!list) return;

    list.replaceChildren(...publications.map(renderNewsItem));

    const featuredPublication = publications.find((item) => item.featured === true) || null;
    const featuredBlock = document.getElementById('featuredPublication');

    if (featuredPublication) {
      if (featuredBlock) featuredBlock.hidden = false;
      renderFeatured(featuredPublication);
    } else if (featuredBlock) {
      featuredBlock.hidden = true;
    }

    applyCurrentLanguage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadHomepageNews, { once: true });
  } else {
    loadHomepageNews();
  }
})();
