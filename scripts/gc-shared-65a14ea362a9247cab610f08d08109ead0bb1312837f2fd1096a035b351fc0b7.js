const langButtons = document.querySelectorAll('[data-lang-btn]');
    let currentLang = window.GCIMLanguageRouting.readLanguage();
    const homePages = window.GCIMLanguageRouting.HOME_PAGES;
    function categoryPage(lang, category){ return window.GCIMLanguageRouting.categoryUrl(category, lang); }
    function staticCategory(){
  const category = document.body.dataset.staticCategory || 'all';
  return VALID_NEWS_CATEGORIES.includes(category) ? category : 'all';
    }

    const interfaceTranslations = {
  en: {
    newsControls: 'News controls',
    search: 'Search news',
    category: 'Category',
    pagination: 'Pagination',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    home: 'Global Citizens home',
    englishSwitch: 'Switch to English',
    pressEmail: 'Office of Press Operations email'
  },
  uk: {
    newsControls: 'Пошук і фільтрування публікацій',
    search: 'Пошук публікацій',
    category: 'Категорія',
    pagination: 'Навігація сторінками',
    openMenu: 'Відкрити меню',
    closeMenu: 'Закрити меню',
    home: 'Головна сторінка Global Citizens',
    englishSwitch: 'Перейти до англійської версії',
    pressEmail: 'Електронна пошта Управління з питань роботи з пресою'
  }
    };

    function applyInterfaceTranslations(lang){
  const t = interfaceTranslations[lang] || interfaceTranslations.en;
  document.querySelector('.tools')?.setAttribute('aria-label', t.newsControls);
  document.getElementById('searchInput')?.setAttribute('aria-label', t.search);
  document.getElementById('pagination')?.setAttribute('aria-label', t.pagination);
  document.querySelector('.brand')?.setAttribute('aria-label', t.home);
  document.getElementById('protectedEmail')?.setAttribute('aria-label', t.pressEmail);

  const menuToggle = document.querySelector('.menu-toggle');
  if (menuToggle) {
    const open = document.querySelector('.nav-wrap')?.classList.contains('is-open');
    menuToggle.setAttribute('aria-label', open ? t.closeMenu : t.openMenu);
  }
    }

    const siteLanguages = ['en', 'ar', 'es', 'zh', 'ru', 'fr', 'uk'];
    const supportedLanguages = ['en', 'ar', 'es', 'zh', 'ru', 'fr', 'uk'];

    const mediaInquiryPages = window.GCIMLanguageRouting.SECTION_PAGES.media;

    const aboutPages = window.GCIMLanguageRouting.SECTION_PAGES.about;

    function savePreferredLanguage(lang){ window.GCIMLanguageRouting.saveLanguage(lang); }

    function readPreferredLanguage(){ return window.GCIMLanguageRouting.readLanguage(); }

    function updateLocalizedLinks(lang){
  const mediaLink = document.getElementById('mediaInquiriesLink');
  const aboutLink = document.getElementById('aboutLink');

  if (mediaLink) {
    mediaLink.href = mediaInquiryPages[lang] || mediaInquiryPages.en;
    mediaLink.removeAttribute('aria-disabled');
  }

  if (aboutLink) {
    aboutLink.href = aboutPages[lang] || aboutPages.en;
    aboutLink.removeAttribute('aria-disabled');
  }
    }

    const footerTranslations = {
  en: {
    mediaContacts: 'Media contacts',
    contactInformation: 'Contact information',
    emailUpdates: 'Email Updates',
    subscribeCopy: 'Subscribe to receive the latest official communications from the Press Office.',
    emailAddress: 'Email address',
    subscribe: 'Subscribe',
    unsubscribe: 'You may unsubscribe at any time.'
  },
  ar: {
    mediaContacts: 'جهات اتصال وسائل الإعلام',
    contactInformation: 'معلومات الاتصال',
    emailUpdates: 'تحديثات البريد الإلكتروني',
    subscribeCopy: 'اشترك لتلقي أحدث الاتصالات الرسمية الصادرة عن المكتب الصحفي.',
    emailAddress: 'عنوان البريد الإلكتروني',
    subscribe: 'اشترك',
    unsubscribe: 'يمكن إلغاء الاشتراك في أي وقت.'
  },
  es: {
    mediaContacts: 'Contactos para medios',
    contactInformation: 'Información de contacto',
    emailUpdates: 'Actualizaciones por correo electrónico',
    subscribeCopy: 'Suscríbase para recibir las comunicaciones oficiales más recientes de la Oficina de Prensa.',
    emailAddress: 'Correo electrónico',
    subscribe: 'Suscribirse',
    unsubscribe: 'Puede cancelar la suscripción en cualquier momento.'
  },
  zh: {
    mediaContacts: '媒体联系方式',
    contactInformation: '联系信息',
    emailUpdates: '电子邮件更新',
    subscribeCopy: '订阅以接收新闻办公室发布的最新官方信息。',
    emailAddress: '电子邮件地址',
    subscribe: '订阅',
    unsubscribe: '您可以随时取消订阅。'
  },
  ru: {
    mediaContacts: 'Контакты для СМИ',
    contactInformation: 'Контактная информация',
    emailUpdates: 'Рассылка по электронной почте',
    subscribeCopy: 'Подпишитесь на получение последних официальных сообщений Пресс-офиса.',
    emailAddress: 'Адрес электронной почты',
    subscribe: 'Подписаться',
    unsubscribe: 'От подписки можно отказаться в любое время.'
  },
  fr: {
    mediaContacts: 'Contacts médias',
    contactInformation: 'Coordonnées',
    emailUpdates: 'Actualités par courrier électronique',
    subscribeCopy: 'Abonnez-vous afin de recevoir les dernières communications officielles du Service de presse.',
    emailAddress: 'Adresse électronique',
    subscribe: 'S’abonner',
    unsubscribe: 'Vous pouvez vous désabonner à tout moment.'
  },
  uk: {
    mediaContacts: 'Контакти для ЗМІ',
    contactInformation: 'Контактна інформація',
    emailUpdates: 'Електронна розсилка',
    subscribeCopy: 'Підпишіться на отримання актуальної офіційної інформації пресофісу.',
    emailAddress: 'Адреса електронної пошти',
    subscribe: 'Підписатися',
    unsubscribe: 'Від підписки можна відмовитися в будь-який час.'
  }
    };

    function translateFooter(lang){
  const t = footerTranslations[lang] || footerTranslations.en;
  const disclaimer = document.getElementById('footerDisclaimer');
  if (disclaimer && disclaimer.dataset[lang]) disclaimer.textContent = disclaimer.dataset[lang];

  const mediaContacts = document.getElementById('footerMediaContacts');
  const contactInformation = document.getElementById('footerContactInformation');
  const emailUpdates = document.getElementById('footerEmailUpdates');
  const subscribeCopy = document.getElementById('footerSubscribeCopy');
  const emailLabel = document.getElementById('footerEmailLabel');
  const emailInput = document.getElementById('subscribeEmail');
  const subscribeButton = document.getElementById('footerSubscribeButton');
  const subscribeNote = document.getElementById('footerSubscribeNote');

  if (mediaContacts) mediaContacts.textContent = t.mediaContacts;
  if (contactInformation) contactInformation.textContent = t.contactInformation;
  if (emailUpdates) emailUpdates.textContent = t.emailUpdates;
  if (subscribeCopy) subscribeCopy.textContent = t.subscribeCopy;
  if (emailLabel) emailLabel.textContent = t.emailAddress;
  if (emailInput) emailInput.placeholder = t.emailAddress;
  if (subscribeButton) subscribeButton.textContent = t.subscribe;
  if (subscribeNote) subscribeNote.textContent = t.unsubscribe;
    }

    function setLanguage(lang){
  if (!supportedLanguages.includes(lang)) lang = 'en';
  currentLang = lang;
  savePreferredLanguage(lang);
  updateLocalizedLinks(lang);
  if (window.GCIMLanguageRouting) {
    window.GCIMLanguageRouting.wirePage(lang);
  } else {
  document.addEventListener("DOMContentLoaded", () => {
    window.GCIMLanguageRouting.wirePage(lang);
  }, { once: true });
    }
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelector('.brand')?.setAttribute('href', homePages[lang] || 'index.html');
  applyInterfaceTranslations(lang);
  translateFooter(lang);
  langButtons.forEach(btn => {
    const isActive = btn.dataset.langBtn === lang;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
  const mobileLang = document.getElementById('mobileLang');
  if (mobileLang) mobileLang.value = lang;

  document.querySelectorAll('[data-en]').forEach(el => {
    el.textContent = el.dataset[lang] || el.dataset.en;
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

    langButtons.forEach(btn => {
  btn.addEventListener('click', () => { window.location.href = categoryPage(btn.dataset.langBtn, staticCategory()); });
    });


    const mobileLang = document.getElementById('mobileLang');
    if (mobileLang) {
  mobileLang.addEventListener('change', () => { window.location.href = categoryPage(mobileLang.value, staticCategory()); });
    }

    const menuToggle = document.querySelector('.menu-toggle');
    const navWrap = document.querySelector('.nav-wrap');

    if (menuToggle && navWrap) {
  menuToggle.addEventListener('click', () => {
    const open = !navWrap.classList.contains('is-open');
    navWrap.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    const labels = interfaceTranslations[currentLang] || interfaceTranslations.en;
    menuToggle.setAttribute('aria-label', open ? labels.closeMenu : labels.openMenu);
  });

  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
if (window.matchMedia('(max-width: 840px)').matches) {
navWrap.classList.remove('is-open');
menuToggle.setAttribute('aria-expanded', 'false');
menuToggle.setAttribute('aria-label', (interfaceTranslations[currentLang] || interfaceTranslations.en).openMenu);
}
    });
  });
    }

    const searchInput = document.getElementById('searchInput');

    const categorySelect = document.getElementById('categorySelect');
    if (categorySelect) {
  categorySelect.addEventListener('change', () => {
    window.location.href = categoryPage(currentLang, categorySelect.value);
  });
    }

const VALID_NEWS_CATEGORIES = ['all', 'movement-official-statements', 'movement-press-releases', 'movement-open-letters-petitions', 'movement-information-notes', 'movement-urgent-appeals-cases', 'movement-reports-submissions', 'coordinator-statements-commentary', 'coordinator-speeches-remarks', 'coordinator-policy-perspectives'];

    function readCategoryFromPage(){
  return staticCategory();
    }

    function updateCategoryNavActive(category){
  document.querySelectorAll('[data-category-nav]').forEach(link => {
    const isActive = link.dataset.categoryNav === category;
    link.classList.toggle('active', isActive);
    if (isActive) {
link.setAttribute('aria-current', 'page');
    } else {
link.removeAttribute('aria-current');
    }
  });
    }

    function applyCategoryFromPage(){
  const category = readCategoryFromPage();
  updateCategoryNavActive(category);
  if (categorySelect) categorySelect.value = category;
    }
    let newsItems = [...document.querySelectorAll('.news-item')];
    const resultsLabel = document.getElementById('resultsLabel');
    const pagination = document.getElementById('pagination');
    const pageNumbers = document.getElementById('pageNumbers');
    const prevPage = document.getElementById('prevPage');
    const nextPage = document.getElementById('nextPage');

    const PAGE_SIZE = 10;
    let currentPage = 1;
    let filteredItems = [...newsItems];

    window.GCIMRefreshHomeNews = function(){
  newsItems = [...document.querySelectorAll('.news-item')];
  filteredItems = [...newsItems];
  currentPage = 1;
  filterNews(true);
    };

    function paginationLabels(){
  return {
    en: { previous:'Previous', next:'Next' },
    ar: { previous:'السابق', next:'التالي' },
    es: { previous:'Anterior', next:'Siguiente' },
    zh: { previous:'上一页', next:'下一页' },
    ru: { previous:'Назад', next:'Далее' },
    fr: { previous:'Précédent', next:'Suivant' },
    uk: { previous:'Попередня', next:'Наступна' }
  }[currentLang] || { previous:'Previous', next:'Next' };
    }

    function renderPagination(totalPages){
  if (!pagination || !pageNumbers || !prevPage || !nextPage) return;

  const labels = paginationLabels();
  prevPage.textContent = labels.previous;
  nextPage.textContent = labels.next;

  // Hide pagination if there is only one page of results.
  pagination.hidden = totalPages <= 1;
  pageNumbers.innerHTML = '';

  if (totalPages <= 1) return;

  prevPage.disabled = currentPage === 1;
  nextPage.disabled = currentPage === totalPages;

  for (let page = 1; page <= totalPages; page++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(page);
    button.setAttribute('aria-label', currentLang === 'uk' ? `Сторінка ${page}` : `Page ${page}`);

    if (page === currentPage) {
button.classList.add('current');
button.setAttribute('aria-current', 'page');
button.disabled = true;
    } else {
button.addEventListener('click', () => {
currentPage = page;
renderNewsPage();
document.getElementById('newsList')?.scrollIntoView({ behavior:'smooth', block:'start' });
});
    }

    pageNumbers.appendChild(button);
  }
    }

    function renderNewsPage(){
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  newsItems.forEach(item => item.style.display = 'none');

  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  filteredItems.slice(start, end).forEach(item => {
    item.style.display = 'grid';
  });

  const labels = {
    en: `Publications: ${filteredItems.length}`,
    ar: `المنشورات: ${filteredItems.length}`,
    es: `Publicaciones: ${filteredItems.length}`,
    zh: `出版物：${filteredItems.length}`,
    ru: `Публикации: ${filteredItems.length}`,
    fr: `Publications : ${filteredItems.length}`,
    uk: `Публікації: ${filteredItems.length}`
  };
  if (resultsLabel) resultsLabel.textContent = labels[currentLang] || labels.en;

  renderPagination(totalPages);
    }

    async function filterNews(resetPage = false){
  if (!searchInput) return;
  if (searchInput.value.trim() && window.GCIMNewsSearch) {
    await window.GCIMNewsSearch.ensureLoaded();
  }
  const q = searchInput.value.trim().toLowerCase();
  filteredItems = newsItems.filter(item => {
    if (window.GCIMNewsSearch) return window.GCIMNewsSearch.matches(item, q);
    const text = ((item.dataset.search || '') + ' ' + item.innerText).toLowerCase();
    return !q || text.includes(q);
  });
  if (resetPage) currentPage = 1;
  renderNewsPage();
    }

    if (prevPage) {
  prevPage.addEventListener('click', () => {
    if (currentPage <= 1) return;
    currentPage--;
    renderNewsPage();
    document.getElementById('newsList')?.scrollIntoView({ behavior:'smooth', block:'start' });
  });
    }

    if (nextPage) {
  nextPage.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
    if (currentPage >= totalPages) return;
    currentPage++;
    renderNewsPage();
    document.getElementById('newsList')?.scrollIntoView({ behavior:'smooth', block:'start' });
  });
    }

    if (searchInput) searchInput.addEventListener('input', () => filterNews(true));

    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    applyCategoryFromPage();
    setLanguage(window.GCIMLanguageRouting.readLanguage());
    filterNews(true);
