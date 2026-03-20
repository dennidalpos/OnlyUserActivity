(function attachAdminCsrf() {
  function getCsrfToken() {
    const meta = document.querySelector('meta[name="admin-csrf-token"]');
    return meta ? meta.getAttribute('content') || '' : '';
  }

  function isSafeMethod(method) {
    return ['GET', 'HEAD', 'OPTIONS'].includes((method || 'GET').toUpperCase());
  }

  function isSameOriginAdminUrl(urlValue) {
    try {
      const url = new URL(urlValue, window.location.origin);
      return url.origin === window.location.origin && url.pathname.startsWith('/admin');
    } catch (error) {
      return false;
    }
  }

  function injectHiddenInputs(root = document) {
    const csrfToken = getCsrfToken();
    if (!csrfToken) {
      return;
    }

    root.querySelectorAll('form[method]').forEach((form) => {
      const method = (form.getAttribute('method') || 'GET').toUpperCase();
      if (isSafeMethod(method)) {
        return;
      }

      let input = form.querySelector('input[name="_csrf"]');
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = '_csrf';
        form.appendChild(input);
      }

      input.value = csrfToken;
    });
  }

  const originalFetch = window.fetch ? window.fetch.bind(window) : null;
  if (originalFetch) {
    window.fetch = function csrfAwareFetch(input, init = {}) {
      const method = (init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const urlValue = typeof input === 'string' ? input : input.url;

      if (!isSafeMethod(method) && isSameOriginAdminUrl(urlValue)) {
        const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
        headers.set('x-csrf-token', getCsrfToken());
        init = { ...init, headers };
      }

      return originalFetch(input, init);
    };
  }

  document.addEventListener('DOMContentLoaded', () => injectHiddenInputs());
  document.addEventListener('submit', (event) => injectHiddenInputs(event.target));
})();
