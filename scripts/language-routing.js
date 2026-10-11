/* GCIM Press Office language routing — static URL edition. */
(function (global) {
  'use strict';

  const SUPPORTED_LANGUAGES = Object.freeze(['en', 'ar', 'es', 'zh', 'ru', 'fr', 'uk']);
  const STORAGE_KEY = 'gcimPreferredLanguage';
  const HOME_PAGES = Object.freeze({
    en: 'index.html', ar: 'index-ar.html', es: 'index-es.html', zh: 'index-zh.html',
    ru: 'index-ru.html', fr: 'index-fr.html', uk: 'index-uk.html'
  });
  const SECTION_PAGES = Object.freeze({
    about: Object.freeze({
      en:'about.html', ar:'about-ar.html', es:'about-es.html', zh:'about-zh.html', ru:'about-ru.html', fr:'about-fr.html', uk:'about-uk.html'
    }),
    media: Object.freeze({
      en:'media-inquiries.html', ar:'media-inquiries-ar.html', es:'media-inquiries-es.html', zh:'media-inquiries-zh.html', ru:'media-inquiries-ru.html', fr:'media-inquiries-fr.html', uk:'media-inquiries-uk.html'
    })
  });

  function normalizeLanguage(lang, fallback='en') {
    return SUPPORTED_LANGUAGES.includes(lang) ? lang : fallback;
  }
  function saveLanguage(lang) {
    lang=normalizeLanguage(lang);
    try { localStorage.setItem(STORAGE_KEY, lang); } catch(e) {}
    return lang;
  }
  function readLanguage(fallback='en') {
    const pageLang=(document.documentElement.dataset.pageLanguage || document.documentElement.lang || '').toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(pageLang)) return pageLang;
    try {
      const saved=localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED_LANGUAGES.includes(saved)) return saved;
    } catch(e) {}
    return normalizeLanguage(fallback);
  }
  function languageSuffix(lang) { return lang === 'en' ? '' : '-' + lang; }
  function homeUrl(lang) { lang=normalizeLanguage(lang); return HOME_PAGES[lang]; }
  function categoryUrl(category, lang) {
    lang=normalizeLanguage(lang);
    return (category && category !== 'all') ? category + languageSuffix(lang) + '.html' : homeUrl(lang);
  }
  function sectionUrl(section, lang) {
    const pages=SECTION_PAGES[section]; lang=normalizeLanguage(lang);
    return pages ? (pages[lang] || pages.en) : '';
  }
  function publicationUrl(href, lang) {
    lang=normalizeLanguage(lang);
    if (!href) return href;
    const trimmed=href.trim();
    const match=trimmed.match(/^(.+)-(?:en|ar|es|zh|ru|fr|uk)(\.html)(#[^?]*)?$/i);
    if (match) return match[1] + '-' + lang + match[2] + (match[3] || '');
    return href;
  }
  function wireHomeLinks(lang, root=document) {
    lang=normalizeLanguage(lang);
    root.querySelectorAll('a.brand').forEach(link => link.setAttribute('href', homeUrl(lang)));
  }
  function wireSectionLinks(lang, root=document) {
    const aboutUrl=sectionUrl('about',lang), mediaUrl=sectionUrl('media',lang);
    const aboutById=root.getElementById ? root.getElementById('aboutLink') : null;
    if (aboutById) aboutById.setAttribute('href',aboutUrl);
    root.querySelectorAll('a:not([data-lang-link])').forEach(link => {
      const href=link.getAttribute('href') || '';
      if (/^about(?:-(?:ar|es|zh|ru|fr|uk))?\.html(?:#.*)?$/i.test(href)) link.setAttribute('href',aboutUrl);
      if (link.classList.contains('media-link') || link.id==='mediaInquiriesLink' || /^media-inquiries(?:-(?:ar|es|zh|ru|fr|uk))?\.html(?:#.*)?$/i.test(href)) link.setAttribute('href',mediaUrl);
    });
  }
  function wirePublicationLinks(lang, root=document) {
    root.querySelectorAll('.news-item a[href]:not([target="_blank"]), a[data-publication-link][href]').forEach(link => {
      const href=link.getAttribute('href'); if (!href || href==='#') return;
      if (!link.dataset.languageBaseHref) link.dataset.languageBaseHref=href;
      link.setAttribute('href',publicationUrl(link.dataset.languageBaseHref,lang));
    });
    const featured=root.getElementById ? root.getElementById('featuredLink') : null;
    if (featured) {
      const publicationId=featured.dataset.featuredId || '2026-09-04-press-office-launch';
      featured.setAttribute('href',publicationId + '-' + lang + '.html');
    }
  }
  function wireCategoryLinks(lang, root=document) {
    root.querySelectorAll('[data-category-nav]').forEach(link => {
      const category=link.dataset.categoryNav;
      link.setAttribute('href', category === 'all' ? homeUrl(lang) : categoryUrl(category,lang));
    });
  }
  function wirePage(lang, root=document) {
    lang=saveLanguage(lang);
    wireHomeLinks(lang,root); wireSectionLinks(lang,root); wirePublicationLinks(lang,root); wireCategoryLinks(lang,root);
    return lang;
  }
  global.GCIMLanguageRouting=Object.freeze({
    SUPPORTED_LANGUAGES, STORAGE_KEY, SECTION_PAGES, HOME_PAGES,
    normalizeLanguage, saveLanguage, readLanguage, homeUrl, categoryUrl, sectionUrl, publicationUrl,
    wireHomeLinks, wireSectionLinks, wirePublicationLinks, wireCategoryLinks, wirePage
  });
})(window);

(function () {
  'use strict';

  let searchIndex = null;
  let searchIndexPromise = null;

  async function ensureLoaded() {
    if (searchIndex) return searchIndex;

    if (!searchIndexPromise) {
      searchIndexPromise = fetch('search-index.json', {
        // Reuse a fresh HTTP cache entry; revalidate normally when it expires.
        cache: 'default',
        credentials: 'same-origin'
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Search index request failed');
          return response.json();
        })
        .then(function (data) {
          if (
            !data ||
            data.version !== 1 ||
            !data.publications ||
            typeof data.publications !== 'object' ||
            Array.isArray(data.publications)
          ) {
            throw new Error('Invalid search index');
          }

          searchIndex = data.publications;
          return searchIndex;
        })
        .catch(function () {
          searchIndexPromise = null;
          return null;
        });
    }

    return searchIndexPromise;
  }

  function getSearchText(item) {
    const localText =
      ((item.dataset.search || '') + ' ' + (item.innerText || '')).toLowerCase();

    if (!searchIndex) return localText;

    const publicationId = item.dataset.searchId || '';
    const fullText =
      publicationId && typeof searchIndex[publicationId] === 'string'
        ? searchIndex[publicationId]
        : '';

    return (localText + ' ' + fullText).toLowerCase();
  }

  function matches(item, query) {
    if (!query) return true;
    return getSearchText(item).includes(query);
  }

  window.GCIMNewsSearch = {
    ensureLoaded: ensureLoaded,
    matches: matches
  };
})();

/* Fit the whole mobile masthead title after fonts and layout are ready. */
(()=>{const start=()=>{const title=document.querySelector('.masthead .brand-copy strong');if(!title)return;const box=title.parentElement;let pending=false;const fit=()=>{pending=false;title.style.removeProperty('font-size');if(innerWidth>840)return;const available=box.clientWidth-1;if(available<=0)return;const range=document.createRange();range.selectNodeContents(title);for(let i=0;i<4;i++){const width=range.getBoundingClientRect().width;if(width<=available)break;const size=parseFloat(getComputedStyle(title).fontSize);title.style.setProperty('font-size',`${size*available/width*.98}px`,'important');}};const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(fit);}};new ResizeObserver(schedule).observe(box);new MutationObserver(schedule).observe(title,{childList:true,characterData:true,subtree:true});addEventListener('resize',schedule);document.fonts.ready.then(schedule);document.fonts.addEventListener('loadingdone',schedule);schedule();};document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();})();

/* Shared subscription form behavior. */
(() => {
  function wire() {
    const form = document.getElementById('subscribeForm');
    if (form) form.addEventListener('submit', event => event.preventDefault());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, {once: true});
  else wire();
})();
