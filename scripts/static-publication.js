/* GCIM Press Office static publication-page controls. */
(function () {
  'use strict';

  const LANGS = ['en', 'ar', 'es', 'zh', 'ru', 'fr', 'uk'];

  function currentLanguage() {
    const lang = document.documentElement.dataset.pageLanguage || document.documentElement.lang;
    return LANGS.includes(lang) ? lang : 'en';
  }

  function destination(lang) {
    return document.documentElement.dataset['alternate' + lang.charAt(0).toUpperCase() + lang.slice(1)] || '';
  }

  function selectLanguage(lang) {
    if (!LANGS.includes(lang)) return;
    try { localStorage.setItem('gcimPreferredLanguage', lang); } catch (e) {}
    const href = destination(lang);
    if (href) window.location.href = href;
  }

  function wireUi() {
    const lang = currentLanguage();
    try { localStorage.setItem('gcimPreferredLanguage', lang); } catch (e) {}

    document.querySelectorAll('[data-lang-btn]').forEach((button) => {
      const active = button.dataset.langBtn === lang;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      button.addEventListener('click', () => selectLanguage(button.dataset.langBtn));
    });

    const mobileLang = document.getElementById('mobileLang');
    if (mobileLang) {
      mobileLang.value = lang;
      mobileLang.addEventListener('change', () => selectLanguage(mobileLang.value));
    }

    // Return to the home page in the language currently displayed.
    const brand = document.querySelector('a.brand');
    if (brand) {
      brand.addEventListener('click', (event) => {
        event.preventDefault();
        const visibleLang = currentLanguage();
        window.location.href = window.GCIMLanguageRouting ? window.GCIMLanguageRouting.homeUrl(visibleLang) : (visibleLang === 'en' ? 'index.html' : 'index-' + visibleLang + '.html');
      });
    }
    const backToNews = document.getElementById('backToNews');
    if (backToNews) { const visibleLang = currentLanguage(); backToNews.href = window.GCIMLanguageRouting ? window.GCIMLanguageRouting.homeUrl(visibleLang) : (visibleLang === 'en' ? 'index.html' : 'index-' + visibleLang + '.html'); }
    const copyLinkButton = document.getElementById('copyLinkButton');
    if (copyLinkButton) {
      const copyLinkLabel = document.getElementById('copyLinkLabel');
      if (copyLinkLabel) copyLinkButton.setAttribute('aria-label', copyLinkLabel.textContent);
      copyLinkButton.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          copyLinkButton.title = currentLanguage() === 'ru' ? 'Ссылка скопирована' : 'Link copied';
          window.setTimeout(() => { copyLinkButton.title = copyLinkButton.getAttribute('aria-label') || 'Copy link'; }, 1600);
        } catch (e) {}
      });
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

    const form = document.getElementById('subscribeForm');
    if (form) form.addEventListener('submit', (event) => event.preventDefault());

    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    const user = ['press', 'office'].join('');
    const domain = ['gcim', 'eu'].join('.');
    const address = user + String.fromCharCode(64) + domain;
    const footerEmail = document.getElementById('protectedEmail');
    if (footerEmail) {
      footerEmail.textContent = address;
      footerEmail.href = ['mai', 'lto:'].join('') + address;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireUi, { once: true });
  } else {
    wireUi();
  }
})();
