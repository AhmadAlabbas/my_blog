'use strict';
(async () => {
  const main = document.querySelector('main');
  try {
    const response = await fetch('admin-preview-data.json');
    if (!response.ok) throw new Error('Preview unavailable');
    const sections = await response.json();
    const show = key => {
      if (!sections[key]) key = 'overview';
      main.innerHTML = '<p class="notice">Read-only design preview. Publishing, uploads, and messages work in the PHP dashboard after Hostinger setup.</p>' + sections[key];
      main.querySelectorAll('input,textarea,select,button').forEach(control => { control.disabled = true; });
      main.querySelectorAll('form').forEach(form => form.addEventListener('submit', event => event.preventDefault()));
      main.querySelectorAll('a').forEach(link => {
        const url = new URL(link.getAttribute('href'), location.href);
        if (url.searchParams.has('section')) {
          const target = url.searchParams.get('section');
          const editing = url.searchParams.has('new') || url.searchParams.has('edit');
          const section = editing && target === 'books' ? (url.searchParams.get('language') === 'ar' ? 'arabic-book-editor' : 'book-editor') : editing && target === 'articles' ? 'editor' : target;
          link.href = '#' + section;
        } else if (url.pathname.includes('/admin') || url.pathname.includes('preview.php')) {
          link.removeAttribute('href'); link.setAttribute('aria-disabled','true');
        }
      });
      document.querySelectorAll('[data-preview-nav]').forEach(link => {
        if (link.dataset.previewNav === key) link.setAttribute('aria-current','page');
        else link.removeAttribute('aria-current');
      });
    };
    show(location.hash.slice(1) || 'overview');
    window.addEventListener('hashchange', () => show(location.hash.slice(1)));
  } catch {
    main.querySelector('.notice').textContent = 'The preview could not load. Refresh the page, or install the included PHP dashboard on Hostinger.';
  }
})();
