const openMenuLabel = window.GCIMLanguageRouting.readLanguage() === 'uk' ? 'Відкрити меню' : 'Open menu';
const closeMenuLabel = window.GCIMLanguageRouting.readLanguage() === 'uk' ? 'Закрити меню' : 'Close menu';

    const PAGE_LANGUAGE = window.GCIMLanguageRouting.readLanguage();
    try {
      localStorage.setItem('gcimPreferredLanguage', PAGE_LANGUAGE);
    } catch (e) {}

    if (window.GCIMLanguageRouting) {
      window.GCIMLanguageRouting.wirePage(PAGE_LANGUAGE);
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        window.GCIMLanguageRouting.wirePage(PAGE_LANGUAGE);
      }, { once: true });
    }

    document.querySelectorAll('[data-lang-link]').forEach(link => {
      link.addEventListener('click', () => {
        const lang = link.dataset.langLink;
        if (lang) {
          try {
            localStorage.setItem('gcimPreferredLanguage', lang);
          } catch (e) {}
        }
      });
    });

    const langLinks = document.querySelectorAll('[data-lang-link]');
    let currentLang = window.GCIMLanguageRouting.readLanguage();

    function setLanguage(lang){
      currentLang = lang;
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

      langLinks.forEach(link => {
        const isActive = link.dataset.langLink === lang;
        link.classList.toggle('active', isActive);
        if (isActive) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      });

      document.querySelectorAll('[data-en]').forEach(el => {
        if (el.dataset[lang]) el.textContent = el.dataset[lang];
      });

      document.querySelectorAll('[data-placeholder-en]').forEach(el => {
        const key = 'placeholder' + lang.charAt(0).toUpperCase() + lang.slice(1);
        el.placeholder = el.dataset[key] || el.dataset.placeholderEn;
      });

      document.querySelectorAll('option[data-en]').forEach(option => {
        if (option.dataset[lang]) option.textContent = option.dataset[lang];
      });

      filterNews();
    }

    const mobileLang = document.getElementById('mobileLang');
    if (mobileLang) {
      mobileLang.addEventListener('change', () => {
        if (!mobileLang.value) return;

        const targetLang = /-(ar|es|zh|ru|fr|uk)\.html$/.exec(mobileLang.value)?.[1] || 'en';
        if (targetLang) {
          try {
            localStorage.setItem('gcimPreferredLanguage', targetLang);
          } catch (e) {}
        }

        window.location.href = mobileLang.value;
      });
    }

    const menuToggle = document.querySelector('.menu-toggle');
    const navWrap = document.querySelector('.nav-wrap');

    if (menuToggle && navWrap) {
      menuToggle.addEventListener('click', () => {
        const open = !navWrap.classList.contains('is-open');
        navWrap.classList.toggle('is-open', open);
        menuToggle.setAttribute('aria-expanded', String(open));
        menuToggle.setAttribute('aria-label', open ? closeMenuLabel : openMenuLabel);
      });

      document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
          if (window.matchMedia('(max-width: 840px)').matches) {
            navWrap.classList.remove('is-open');
            menuToggle.setAttribute('aria-expanded', 'false');
            menuToggle.setAttribute('aria-label', openMenuLabel);
          }
        });
      });
    }

    const searchInput = document.getElementById('searchInput');
    const categorySelect = document.getElementById('categorySelect');
    const newsItems = [...document.querySelectorAll('.news-item')];
    const resultsLabel = document.getElementById('resultsLabel');

    function filterNews(){
      if (!searchInput || !categorySelect || !resultsLabel) return;
      const q = searchInput.value.trim().toLowerCase();
      const cat = categorySelect.value;
      let visible = 0;

      newsItems.forEach(item => {
        const text = (item.dataset.search + ' ' + item.innerText).toLowerCase();
        const matchesSearch = !q || text.includes(q);
        const matchesCategory = cat === 'all' || item.dataset.category === cat;
        const show = matchesSearch && matchesCategory;
        item.style.display = show ? 'grid' : 'none';
        if(show) visible++;
      });

      const labels = {
        en: `Publications: ${visible}`,
        ar: `المنشورات: ${visible}`,
        es: `Publicaciones: ${visible}`,
        zh: `出版物：${visible}`,
        ru: `Публикации: ${visible}`,
        fr: `Publications : ${visible}`,
        uk: `Публікації: ${visible}`
      };
      resultsLabel.textContent = labels[currentLang] || labels.en;
    }

    if (searchInput) searchInput.addEventListener('input', filterNews);
    if (categorySelect) categorySelect.addEventListener('change', filterNews);
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
    setLanguage(window.GCIMLanguageRouting.readLanguage());
    filterNews();
