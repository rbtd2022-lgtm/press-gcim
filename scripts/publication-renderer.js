/* GCIM Press Office unified publication-page renderer. */
(function () {
  'use strict';

  const LANGS = ['en', 'ar', 'es', 'zh', 'ru', 'fr', 'uk'];

  const UI = {
    en: {
      service: 'Service information',
      resources: 'Links and attachments',
      link: 'Link',
      attachment: 'Attachment',
      notFound: 'Publication not found.',
    },
    ar: {
      service: 'معلومات إدارية',
      resources: 'الروابط والمرفقات',
      link: 'رابط',
      attachment: 'مرفق',
      notFound: 'تعذر العثور على المنشور.',
    },
    es: {
      service: 'Información administrativa',
      resources: 'Enlaces y archivos adjuntos',
      link: 'Enlace',
      attachment: 'Archivo adjunto',
      notFound: 'No se ha encontrado la publicación.',
    },
    zh: {
      service: '行政信息',
      resources: '链接和附件',
      link: '链接',
      attachment: '附件',
      notFound: '未找到该发布。',
    },
    ru: {
      service: 'Служебная информация',
      resources: 'Ссылки и вложения',
      link: 'Ссылка',
      attachment: 'Вложение',
      notFound: 'Публикация не найдена.',
    },
    fr: {
      service: 'Informations administratives',
      resources: 'Liens et pièces jointes',
      link: 'Lien',
      attachment: 'Pièce jointe',
      notFound: 'Publication introuvable.',
    },
    uk: {
      service: 'Службова інформація',
      resources: 'Посилання та вкладення',
      link: 'Посилання',
      attachment: 'Вкладення',
      notFound: 'Публікацію не знайдено.',
    }
  };

  let publication = null;
  let currentLang = 'en';

  function preferredLanguage() {
    const pageLang = (document.documentElement.dataset.pageLanguage || document.documentElement.lang || '').toLowerCase();
    return LANGS.includes(pageLang) ? pageLang : 'en';
  }

  async function loadPublication() {
    if (window.GCIM_PUBLICATION_DATA) return window.GCIM_PUBLICATION_DATA;
    const file = (location.pathname.split('/').pop() || '').replace(/\.html$/i, '');
    const id = file.replace(/-(?:en|ar|es|zh|ru|fr|uk)$/i, '');
    if (window.GCIM_NEWS_DATA) {
      const items = Array.isArray(window.GCIM_NEWS_DATA.publications) ? window.GCIM_NEWS_DATA.publications : [];
      return items.find((item) => item.id === id && typeof isPublicationReadyForPublic === 'function' && isPublicationReadyForPublic(item)) || null;
    }
    return null;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function createSafeLink(item, type, lang) {
    const a = document.createElement('a');
    a.className = 'resource-item';
    a.href = item.url || '#';

    if (/^https?:\/\//i.test(a.href)) {
      a.target = '_blank';
      a.rel = 'noopener';
    }

    const title = document.createElement('span');
    title.className = 'resource-title';
    title.textContent = item.label || (type === 'attachment' ? UI[lang].attachment : UI[lang].link);
    a.appendChild(title);

    const metaParts = [];
    if (type === 'attachment' && item.format) metaParts.push(item.format);
    if (type === 'attachment' && item.size) metaParts.push(item.size);

    if (metaParts.length) {
      const meta = document.createElement('span');
      meta.className = 'resource-meta';
      meta.textContent = metaParts.join(' · ');
      a.appendChild(meta);
    }

    return a;
  }

  function renderBody(blocks) {
    const body = document.getElementById('publicationBody');
    clear(body);

    const quoteAttributions = new Set([
      'Папа Франциск',
      'Pope Francis',
      'البابا فرنسيس',
      'Papa Francisco',
      '教皇方济各',
      '教宗方济各',
      'Pape François'
    ]);

    (blocks || []).forEach((block, index) => {
      if (
        block.type === 'paragraph' &&
        quoteAttributions.has(block.text || '') &&
        index > 0 &&
        blocks[index - 1] &&
        blocks[index - 1].type === 'quote'
      ) {
        const previous = body.lastElementChild;
        if (previous && previous.tagName === 'BLOCKQUOTE') {
          const attribution = document.createElement('span');
          attribution.className = 'quote-attribution-inline';
          attribution.textContent = block.text || '';
          previous.appendChild(attribution);
        }
        return;
      }

      let el;

      if (block.type === 'heading') {
        el = document.createElement('h2');
        el.textContent = block.text || '';
      } else if (block.type === 'quote') {
        el = document.createElement('blockquote');
        el.textContent = block.text || '';
      } else if (block.type === 'list') {
        el = document.createElement('ul');
        (block.items || []).forEach((text) => {
          const li = document.createElement('li');
          li.textContent = text;
          el.appendChild(li);
        });
      } else {
        el = document.createElement('p');
        if (block.url) {
          const link = document.createElement('a');
          link.href = block.url;
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = block.text || '';
          el.appendChild(link);
        } else {
          el.textContent = block.text || '';
        }
      }

      body.appendChild(el);
    });
  }

  function renderServiceInfo(items, lang) {
    const section = document.getElementById('serviceSection');
    const heading = document.getElementById('serviceHeading');
    const list = document.getElementById('serviceList');
    heading.textContent = UI[lang].service;
    clear(list);

    const entries = Array.isArray(items) ? items : [];
    section.hidden = entries.length === 0;

    entries.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'service-row';

      const dt = document.createElement('div');
      dt.className = 'service-label';
      dt.textContent = item.label || '';

      const dd = document.createElement('div');
      dd.className = 'service-value';
      dd.textContent = item.value || '';

      row.append(dt, dd);
      list.appendChild(row);
    });
  }

  function renderResources(t, lang) {
    const section = document.getElementById('resourcesSection');
    const heading = document.getElementById('resourcesHeading');
    const list = document.getElementById('resourcesList');
    heading.textContent = UI[lang].resources;
    clear(list);

    const links = Array.isArray(t.links) ? t.links : [];
    const attachments = Array.isArray(t.attachments) ? t.attachments : [];
    const hasAny = links.length || attachments.length;
    section.hidden = !hasAny;

    links.forEach((item) => list.appendChild(createSafeLink(item, 'link', lang)));
    attachments.forEach((item) => list.appendChild(createSafeLink(item, 'attachment', lang)));
  }

  function categoryLabel(item, lang) {
    if (!item || typeof isNewsCategory !== 'function' || !isNewsCategory(item.category)) {
      return '';
    }
    const translation = item.translations?.[lang] || item.translations?.en || {};
    if (typeof translation.categoryLabel === 'string' && translation.categoryLabel.trim()) {
      return translation.categoryLabel;
    }
    return getNewsCategoryLabel(item.category, lang);
  }

  function formatDate(date, lang) {
    if (!date) return '';

    const parsed = new Date(date.length === 10 ? date + 'T00:00:00Z' : date);
    if (Number.isNaN(parsed.getTime())) return date;

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

  function setMeta(selector, value) {
    const node = document.head.querySelector(selector);
    if (node) node.setAttribute('content', value);
  }

  function updateMetadata(lang, t) {
    const robots = document.head.querySelector('meta[name="robots"]');
    const canonical = document.head.querySelector('link[rel="canonical"]');
    if (!publication || !t) {
      if (robots) robots.content = 'noindex, follow';
      if (canonical) canonical.removeAttribute('href');
      return;
    }

    const fileName = encodeURIComponent(publication.id) + '-' + lang + '.html';
    const url = new URL(fileName, 'https://press.gcim.eu/');
    const descriptionBlock = (t.body || []).find((block) => block.type === 'paragraph' && block.text);
    const description = Array.from(descriptionBlock?.text || t.title || '').slice(0, 180).join('');
    if (robots) robots.content = 'noindex, follow';
    if (canonical) canonical.href = url.href;
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', t.title || 'Global Citizens');
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:url"]', url.href);
    setMeta('meta[property="og:type"]', 'article');
    const openGraphLocales = { en: 'en_US', ar: 'ar_SA', es: 'es_ES', zh: 'zh_CN', ru: 'ru_RU', fr: 'fr_FR', uk: 'uk_UA' };
    setMeta('meta[property="og:locale"]', openGraphLocales[lang] || 'en_US');
    setMeta('meta[name="twitter:title"]', t.title || 'Global Citizens');
    setMeta('meta[name="twitter:description"]', description);
    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((node) => node.remove());
    const languageTags = { en: 'en-US', ar: 'ar', es: 'es', zh: 'zh-Hans', ru: 'ru', fr: 'fr', uk: 'uk' };
    for (const code of LANGS) {
      const link = document.createElement('link');
      const alternate = new URL(
        encodeURIComponent(publication.id) + '-' + code + '.html',
        'https://press.gcim.eu/'
      );
      link.rel = 'alternate';
      link.hreflang = languageTags[code];
      link.href = alternate.href;
      document.head.appendChild(link);
    }
    const fallback = document.createElement('link');
    const defaultUrl = new URL(
      encodeURIComponent(publication.id) + '-en.html',
      'https://press.gcim.eu/'
    );
    fallback.rel = 'alternate';
    fallback.hreflang = 'x-default';
    fallback.href = defaultUrl.href;
    document.head.appendChild(fallback);
  }

  function localizeChrome(lang) {
    document.querySelectorAll('[data-en]').forEach((el) => {
      const value = el.dataset[lang] || el.dataset.en;
      if (value) el.textContent = value;
    });

    const footerInput = document.getElementById('subscribeEmail');
    if (footerInput) {
      const key = 'placeholder' + lang.charAt(0).toUpperCase() + lang.slice(1);
      footerInput.placeholder = footerInput.dataset[key] || footerInput.dataset.placeholderEn || '';
    }
  }

  function updateLanguageControls(lang) {
    document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
      const active = btn.dataset.langBtn === lang;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    const mobileLang = document.getElementById('mobileLang');
    if (mobileLang) mobileLang.value = lang;
  }

  function updateUrl(lang) {
    const target = document.documentElement.dataset['alternate' + lang.charAt(0).toUpperCase() + lang.slice(1)];
    if (target && location.pathname.split('/').pop() !== target) history.replaceState(null, '', target);
  }

  function render(lang) {
    if (!LANGS.includes(lang)) lang = 'en';
    currentLang = lang;

    if (window.GCIMLanguageRouting) {
      window.GCIMLanguageRouting.saveLanguage(lang);
      window.GCIMLanguageRouting.wirePage(lang);
    }

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    updateLanguageControls(lang);
    localizeChrome(lang);
    updateUrl(lang);
    const brand = document.querySelector('a.brand');
    if (brand) brand.href = (window.GCIMLanguageRouting ? window.GCIMLanguageRouting.homeUrl(lang) : (lang === 'en' ? 'index.html' : 'index-' + lang + '.html'));
    const backToNews = document.getElementById('backToNews');
    if (backToNews) backToNews.href = (window.GCIMLanguageRouting ? window.GCIMLanguageRouting.homeUrl(lang) : (lang === 'en' ? 'index.html' : 'index-' + lang + '.html'));
    const copyLinkButton = document.getElementById('copyLinkButton');
    if (copyLinkButton && !copyLinkButton.dataset.bound) {
      const copyLinkLabel = document.getElementById('copyLinkLabel');
      if (copyLinkLabel) copyLinkButton.setAttribute('aria-label', copyLinkLabel.textContent);
      copyLinkButton.dataset.bound = 'true';
      copyLinkButton.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          copyLinkButton.title = lang === 'ru' ? 'Ссылка скопирована' : 'Link copied';
          window.setTimeout(() => { copyLinkButton.title = copyLinkButton.getAttribute('aria-label') || 'Copy link'; }, 1600);
        } catch (e) {}
      });
    }

    if (!publication) {
      document.getElementById('publicationTitle').textContent = UI[lang].notFound;
      document.getElementById('publicationDate').textContent = '';
      document.getElementById('publicationCategory').textContent = '';
      clear(document.getElementById('publicationBody'));
      document.getElementById('serviceSection').hidden = true;
      document.getElementById('resourcesSection').hidden = true;
      document.title = UI[lang].notFound + ' — Global Citizens';
      updateMetadata(lang, null);
      return;
    }

    const t = publication.translations?.[lang] || publication.translations?.en || {};
    document.getElementById('publicationDate').textContent = formatDate(publication.date, lang);
    document.getElementById('publicationDate').dateTime = publication.date;
    document.getElementById('publicationCategory').textContent = categoryLabel(publication, lang);
    document.getElementById('publicationTitle').textContent = t.title || '';
    renderBody(t.body);
    renderServiceInfo(t.serviceInfo, lang);
    renderResources(t, lang);

    document.title = (t.title || 'Publication') + ' — Global Citizens';
    updateMetadata(lang, t);
  }

  function wireUi() {
    document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
      btn.addEventListener('click', () => render(btn.dataset.langBtn));
    });

    const mobileLang = document.getElementById('mobileLang');
    if (mobileLang) {
      mobileLang.addEventListener('change', () => render(mobileLang.value));
    }

    const menuToggle = document.querySelector('.menu-toggle');
    const navWrap = document.querySelector('.nav-wrap');
    if (menuToggle && navWrap) {
      menuToggle.addEventListener('click', () => {
        const open = !navWrap.classList.contains('is-open');
        navWrap.classList.toggle('is-open', open);
        menuToggle.setAttribute('aria-expanded', String(open));
      });
    }

    const brand = document.querySelector('a.brand');
    if (brand) {
      brand.href = (window.GCIMLanguageRouting ? window.GCIMLanguageRouting.homeUrl(currentLang) : (currentLang === 'en' ? 'index.html' : 'index-' + currentLang + '.html'));
      brand.onclick = (event) => {
        event.preventDefault();
        window.location.href = (window.GCIMLanguageRouting ? window.GCIMLanguageRouting.homeUrl(currentLang) : (currentLang === 'en' ? 'index.html' : 'index-' + currentLang + '.html'));
      };
    }

    const emblem = document.getElementById('headerEmblem');
    if (emblem) {
      emblem.removeAttribute('role');
      emblem.removeAttribute('tabindex');
      emblem.removeAttribute('aria-label');
      emblem.setAttribute('aria-hidden', 'true');
    }

    const form = document.getElementById('subscribeForm');
    if (form) form.addEventListener('submit', (event) => event.preventDefault());

    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    // Preserve email obfuscation.
    const user = ['press', 'office'].join('');
    const domain = ['gcim', 'eu'].join('.');
    const address = user + String.fromCharCode(64) + domain;
    const footerEmail = document.getElementById('protectedEmail');
    if (footerEmail) {
      footerEmail.textContent = address;
      footerEmail.href = ['mai', 'lto:'].join('') + address;
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    wireUi();
    publication = await loadPublication();
    render(preferredLanguage());
  });
})();
