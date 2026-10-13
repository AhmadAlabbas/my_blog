/* YouTube is contacted only after consent and an explicit Play action. */
(() => {
  'use strict';
  const videos = [...document.querySelectorAll('[data-youtube]')];
  videos.forEach(card => {
    const button = card.querySelector('[data-video-play]');
    const stage = card.querySelector('.video-stage');
    const status = card.querySelector('.video-status');
    if (!button || !stage) return;
    button.addEventListener('click', () => {
      if (!window.blogConsent?.allowsOptional()) {
        status.textContent = 'Choose Accept in cookie preferences to play here, or use Watch on YouTube.';
        document.querySelector('[data-cookie-preferences]')?.click();
        return;
      }
      const id = card.dataset.youtube;
      if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      frame.title = card.dataset.videoTitle || 'YouTube video';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      stage.append(frame);
      button.hidden = true;
      status.textContent = 'Video loaded from YouTube. You can also watch on YouTube below.';
    });
  });
  window.addEventListener('blog:consent', event => {
    if (event.detail.optional) return;
    videos.forEach(card => {
      card.querySelector('iframe')?.remove();
      const button = card.querySelector('[data-video-play]');
      if (button) button.hidden = false;
      const status = card.querySelector('.video-status');
      if (status) status.textContent = 'YouTube stays off until you accept optional content and choose Play.';
    });
  });
  const filters = [...document.querySelectorAll('[data-gallery-filter]')];
  filters.forEach(button => button.addEventListener('click', () => {
    const category = button.dataset.galleryFilter;
    filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    const entries = [...document.querySelectorAll('.gallery-item[data-category]')];
    entries.forEach(item => item.hidden = category !== 'All' && item.dataset.category !== category);
    const count = entries.filter(item => !item.hidden).length;
    const status = document.querySelector('[data-gallery-count]');
    if (status) status.textContent = `${count} images · ${category === 'All' ? 'The complete collection' : category}`;
  }));
})();
