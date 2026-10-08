/* Restore contact text and links without exposing complete addresses in HTML. */
(() => {
  'use strict';
  function restore() {
    const domain = ['gcim', 'eu'].join('.');
    ['protectedEmail', 'protectedMediaPageEmail', 'protectedMediaTextEmail', 'protectedLiaisonEmail'].forEach(id => {
      const node = document.getElementById(id);
      if (!node) return;
      const user = id === 'protectedLiaisonEmail' ? ['commun', 'ications'].join('') : ['press', 'office'].join('');
      const address = user + String.fromCharCode(64) + domain;
      node.textContent = address;
      node.href = ['mai', 'lto:'].join('') + address;
    });
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
