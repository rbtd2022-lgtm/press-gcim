/* Future GCIM Press Office news model.
   Every publication is initialized with all seven supported languages. */
const NEWS_LANGUAGES = Object.freeze(['en', 'ar', 'es', 'zh', 'ru', 'fr', 'uk']);

const NEWS_CATEGORIES = Object.freeze({
  release: Object.freeze({
    en: 'Press Release',
    ar: 'بيان صحفي',
    es: 'Comunicado de prensa',
    zh: '新闻稿',
    ru: 'Пресс-релиз',
    fr: 'Communiqué de presse',
    uk: 'Пресреліз'
  }),
  statement: Object.freeze({
    en: 'Official Statement',
    ar: 'بيان رسمي',
    es: 'Declaración oficial',
    zh: '官方声明',
    ru: 'Официальное заявление',
    fr: 'Déclaration officielle',
    uk: 'Офіційна заява'
  }),
  'coordinator-action': Object.freeze({
    en: 'Coordinator’s Actions',
    ar: 'أنشطة المنسق',
    es: 'Actividades del Coordinador',
    zh: '协调员活动',
    ru: 'Деятельность Координатора',
    fr: 'Activités du Coordinateur',
    uk: 'Діяльність Координатора'
  }),
  perspective: Object.freeze({
    en: 'Perspective',
    ar: 'منظور',
    es: 'Perspectiva',
    zh: '视角',
    ru: 'Взгляд',
    fr: 'Perspective',
    uk: 'Погляд'
  })
});

const NEWS_CATEGORY_CODES = Object.freeze(Object.keys(NEWS_CATEGORIES));

function isNewsCategory(code) {
  return NEWS_CATEGORY_CODES.includes(code);
}

function getNewsCategoryLabel(code, lang = 'en') {
  if (!isNewsCategory(code)) {
    throw new Error(`Unsupported news category: ${code}`);
  }
  if (!NEWS_LANGUAGES.includes(lang)) {
    throw new Error(`Unsupported news language: ${lang}`);
  }
  return NEWS_CATEGORIES[code][lang] || NEWS_CATEGORIES[code].en;
}

const NEWS_LANGUAGE_META = Object.freeze({
  en: Object.freeze({ htmlLang: 'en', dir: 'ltr' }),
  ar: Object.freeze({ htmlLang: 'ar', dir: 'rtl' }),
  es: Object.freeze({ htmlLang: 'es', dir: 'ltr' }),
  zh: Object.freeze({ htmlLang: 'zh', dir: 'ltr' }),
  ru: Object.freeze({ htmlLang: 'ru', dir: 'ltr' }),
  fr: Object.freeze({ htmlLang: 'fr', dir: 'ltr' }),
  uk: Object.freeze({ htmlLang: 'uk', dir: 'ltr' })
});

function getNewsDocumentAttributes(lang) {
  const meta = NEWS_LANGUAGE_META[lang];
  if (!meta) {
    throw new Error(`Unsupported news language: ${lang}`);
  }
  return { lang: meta.htmlLang, dir: meta.dir };
}

function applyNewsDocumentLanguage(lang, documentElement) {
  const attrs = getNewsDocumentAttributes(lang);
  const root = documentElement || (typeof document !== 'undefined' ? document.documentElement : null);

  if (root) {
    root.setAttribute('lang', attrs.lang);
    root.setAttribute('dir', attrs.dir);
  }

  return attrs;
}


const TRANSLATION_STATUS_VALUES = Object.freeze(['draft', 'review', 'approved']);

function createTranslationStatus(defaultStatus = 'draft') {
  if (!TRANSLATION_STATUS_VALUES.includes(defaultStatus)) {
    throw new Error(`Unsupported translation status: ${defaultStatus}`);
  }

  return Object.fromEntries(
    NEWS_LANGUAGES.map((lang) => [lang, defaultStatus])
  );
}

function isTranslationStatusValue(status) {
  return TRANSLATION_STATUS_VALUES.includes(status);
}

function areAllTranslationsApproved(publication) {
  if (!publication || !publication.translationStatus || typeof publication.translationStatus !== 'object') {
    return false;
  }

  return NEWS_LANGUAGES.every(
    (lang) => publication.translationStatus[lang] === 'approved'
  );
}

function isNonEmptyNewsString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidNewsDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}

function isValidPublishedBodyBlock(block) {
  if (!block || typeof block !== 'object' || typeof block.type !== 'string') {
    return false;
  }

  if (block.type === 'paragraph' || block.type === 'heading' || block.type === 'quote') {
    return isNonEmptyNewsString(block.text);
  }

  if (block.type === 'list') {
    return Array.isArray(block.items) &&
      block.items.length > 0 &&
      block.items.every(isNonEmptyNewsString);
  }

  return false;
}

function hasRequiredPublicationContent(publication) {
  if (!publication || typeof publication !== 'object') {
    return false;
  }

  if (!isNonEmptyNewsString(publication.id) ||
      !isNonEmptyNewsString(publication.slug) ||
      !isValidNewsDate(publication.date) ||
      !isNewsCategory(publication.category) ||
      (publication.categories !== undefined &&
        (!Array.isArray(publication.categories) ||
          publication.categories.length === 0 ||
          publication.categories.some((category) => !isNewsCategory(category)))) ||
      publication.sourceLanguage !== 'ru' ||
      typeof publication.featured !== 'boolean' ||
      !publication.translations ||
      typeof publication.translations !== 'object') {
    return false;
  }

  return NEWS_LANGUAGES.every((lang) => {
    const translation = publication.translations[lang];

    return translation &&
      typeof translation === 'object' &&
      isNonEmptyNewsString(translation.title) &&
      Array.isArray(translation.body) &&
      translation.body.every(isValidPublishedBodyBlock);
  });
}

function isPublicationReadyForPublic(publication) {
  return areAllTranslationsApproved(publication) &&
    hasRequiredPublicationContent(publication);
}

function createEmptyTranslation() {
  return {
    title: '',
    body: [],
    serviceInfo: [],
    links: [],
    attachments: []
  };
}

function createEmptyTranslations() {
  return Object.fromEntries(
    NEWS_LANGUAGES.map((lang) => [lang, createEmptyTranslation()])
  );
}

function createPublication(seed = {}) {
  const sourceLanguage = seed.sourceLanguage || 'ru';

  if (sourceLanguage !== 'ru') {
    throw new Error(`Unsupported source language: ${sourceLanguage}. GCIM publication sourceLanguage must be ru.`);
  }

  if (seed.category && !isNewsCategory(seed.category)) {
    throw new Error(`Unsupported news category: ${seed.category}`);
  }

  const categories = Array.isArray(seed.categories) && seed.categories.length
    ? [...new Set(seed.categories)]
    : (seed.category ? [seed.category] : []);

  if (categories.some((category) => !isNewsCategory(category))) {
    throw new Error('Unsupported news category in categories.');
  }

  const supplied = seed.translations || {};
  const suppliedStatus = seed.translationStatus || {};
  const translations = createEmptyTranslations();
  const translationStatus = createTranslationStatus('draft');

  for (const lang of NEWS_LANGUAGES) {
    if (supplied[lang] && typeof supplied[lang] === 'object') {
      translations[lang] = { ...supplied[lang] };
    }

    if (Object.prototype.hasOwnProperty.call(suppliedStatus, lang)) {
      const status = suppliedStatus[lang];
      if (!isTranslationStatusValue(status)) {
        throw new Error(`Unsupported translation status for ${lang}: ${status}`);
      }
      translationStatus[lang] = status;
    }
  }

  return {
    id: seed.id || '',
    slug: seed.slug || '',
    date: seed.date || '',
    category: seed.category || '',
    categories,
    sourceLanguage,
    featured: seed.featured === true,
    translations,
    translationStatus
  };
}

function withPublicationLanguage(url, lang) {
  if (!NEWS_LANGUAGES.includes(lang)) {
    throw new Error(`Unsupported news language: ${lang}`);
  }

  if (typeof window !== 'undefined' && window.GCIMLanguageRouting) {
    return window.GCIMLanguageRouting.publicationUrl(url, lang);
  }

  if (!url || url.startsWith('#') || /^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
    return url;
  }

  return url.replace(/-(?:en|ar|es|zh|ru|fr|uk)(\.html)(#[^?]*)?$/i, `-${lang}$1$2`);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NEWS_LANGUAGES, NEWS_CATEGORIES, NEWS_CATEGORY_CODES, isNewsCategory, getNewsCategoryLabel, TRANSLATION_STATUS_VALUES, createTranslationStatus, isTranslationStatusValue, areAllTranslationsApproved, isNonEmptyNewsString, isValidNewsDate, isValidPublishedBodyBlock, hasRequiredPublicationContent, isPublicationReadyForPublic, NEWS_LANGUAGE_META, getNewsDocumentAttributes, applyNewsDocumentLanguage, withPublicationLanguage, createEmptyTranslation, createEmptyTranslations, createPublication };
}
