/* Shared subscription form behavior. */
(() => {
  function wire() {
    const form = document.getElementById('subscribeForm');
    if (form) form.addEventListener('submit', event => event.preventDefault());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, {once: true});
  else wire();
})();
