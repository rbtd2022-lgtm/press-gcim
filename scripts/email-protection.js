/* Restore contact text and links without exposing complete addresses in HTML. */
(() => {
  'use strict';
  function restore() {
    document.querySelectorAll('[data-gc-email]').forEach((node) => {
      node.textContent = atob(node.getAttribute('data-gc-email'));
    });
    document.querySelectorAll('[data-gc-mail]').forEach((node) => {
      node.setAttribute('href', atob(node.getAttribute('data-gc-mail')));
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restore, { once: true });
  } else {
    restore();
  }
})();
