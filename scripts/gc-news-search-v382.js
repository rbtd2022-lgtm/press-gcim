(function () {
  'use strict';

  let searchIndex = null;
  let searchIndexPromise = null;

  async function ensureLoaded() {
    if (searchIndex) return searchIndex;

    if (!searchIndexPromise) {
      searchIndexPromise = fetch('search-index.json', {
        cache: 'no-cache',
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
