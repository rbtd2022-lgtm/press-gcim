/* GCIM Press Office static publication-page controls. */
(function () {
  'use strict';

  const LANGS = ['en', 'ar', 'es', 'zh', 'ru', 'fr', 'uk'];

  const COPY_FEEDBACK = {
    en: ['Link copied', 'Could not copy the link. Please copy it from the address bar.'],
    ru: ['Ссылка скопирована', 'Не удалось скопировать ссылку. Скопируйте её из адресной строки.'],
    ar: ['تم نسخ الرابط', 'تعذّر نسخ الرابط. يُرجى نسخه من شريط العنوان.'],
    es: ['Enlace copiado', 'No se pudo copiar el enlace. Cópielo desde la barra de direcciones.'],
    zh: ['链接已复制', '无法复制链接。请从地址栏复制。'],
    fr: ['Lien copié', 'Impossible de copier le lien. Copiez-le depuis la barre d’adresse.'],
    uk: ['Посилання скопійовано', 'Не вдалося скопіювати посилання. Скопіюйте його з адресного рядка.']
  };

  const TEXT_FEEDBACK = {
    en: ['Text copied', 'Could not copy the text. Please select and copy it manually.'],
    ru: ['Текст скопирован', 'Не удалось скопировать текст. Выделите и скопируйте его вручную.'],
    ar: ['تم نسخ النص', 'تعذّر نسخ النص. يُرجى تحديده ونسخه يدويًا.'],
    es: ['Texto copiado', 'No se pudo copiar el texto. Selecciónelo y cópielo manualmente.'],
    zh: ['文本已复制', '无法复制文本。请选中文本并手动复制。'],
    fr: ['Texte copié', 'Impossible de copier le texte. Sélectionnez-le et copiez-le manuellement.'],
    uk: ['Текст скопійовано', 'Не вдалося скопіювати текст. Виділіть і скопіюйте його вручну.']
  };

  function publicationText() {
    const page = document.getElementById('publicationPage');
    if (!page) return '';
    return ['#publicationTitle', '#publicationDate', '.publication-intro', '#publicationBody']
      .flatMap((selector) => Array.from(page.querySelectorAll(selector)))
      .map((node) => node.innerText.trim())
      .filter(Boolean).join('\n\n');
  }

  async function copyText(text) {
    if (!text) throw new Error('Empty publication');
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return; } catch (e) {}
    }
    const active = document.activeElement;
    const selection = window.getSelection();
    const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i).cloneRange()) : [];
    const field = document.createElement('textarea');
    field.value = text;
    field.readOnly = true;
    field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
    document.body.appendChild(field);
    try {
      field.focus({ preventScroll: true });
      field.select();
      field.setSelectionRange(0, text.length);
      if (!document.execCommand('copy')) throw new Error('Copy failed');
    } finally {
      field.remove();
      if (active && active.focus) active.focus({ preventScroll: true });
      if (selection) {
        selection.removeAllRanges();
        ranges.forEach((range) => selection.addRange(range));
      }
    }
  }

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

    const backToNews = document.getElementById('backToNews');
    if (backToNews) { const visibleLang = currentLanguage(); backToNews.href = window.GCIMLanguageRouting ? window.GCIMLanguageRouting.homeUrl(visibleLang) : (visibleLang === 'en' ? 'index.html' : 'index-' + visibleLang + '.html'); }
    const copyLinkButton = document.getElementById('copyLinkButton');
    if (copyLinkButton) {
      const copyLinkLabel = document.getElementById('copyLinkLabel');
      if (copyLinkLabel) copyLinkButton.setAttribute('aria-label', copyLinkLabel.textContent);
      const originalTitle = copyLinkButton.title;
      const originalLabel = copyLinkButton.getAttribute('aria-label');
      const originalText = copyLinkLabel ? copyLinkLabel.textContent : '';
      if (copyLinkLabel) copyLinkLabel.setAttribute('aria-live', 'polite');
      let feedbackTimer;
      function showFeedback(message, duration) {
        window.clearTimeout(feedbackTimer);
        copyLinkButton.title = message;
        copyLinkButton.setAttribute('aria-label', message);
        if (copyLinkLabel) copyLinkLabel.textContent = message;
        feedbackTimer = window.setTimeout(() => {
          copyLinkButton.title = originalTitle;
          if (originalLabel !== null) copyLinkButton.setAttribute('aria-label', originalLabel);
          else copyLinkButton.removeAttribute('aria-label');
          if (copyLinkLabel) copyLinkLabel.textContent = originalText;
        }, duration);
      }
      copyLinkButton.addEventListener('click', async () => {
        const messages = COPY_FEEDBACK[currentLanguage()];
        try {
          await navigator.clipboard.writeText(window.location.href);
          showFeedback(messages[0], 1600);
        } catch (e) {
          showFeedback(messages[1], 5000);
        }
      });
    }

    const copyTextButton = document.getElementById('copyTextButton');
    if (copyTextButton && document.getElementById('publicationBody')) {
      const status = document.getElementById('copyTextStatus');
      let feedbackTimer;
      copyTextButton.addEventListener('click', async () => {
        window.clearTimeout(feedbackTimer);
        if (status) status.textContent = '';
        const messages = TEXT_FEEDBACK[currentLanguage()];
        try {
          await copyText(publicationText());
          if (status) status.textContent = messages[0];
          feedbackTimer = window.setTimeout(() => { if (status) status.textContent = ''; }, 2000);
        } catch (e) {
          if (status) status.textContent = messages[1];
        }
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

    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireUi, { once: true });
  } else {
    wireUi();
  }
})();
