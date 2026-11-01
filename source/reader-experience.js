'use strict';
// Progressive enhancements for public article and book pages.
// The content, table of contents, sharing and navigation work without JavaScript.
(() => {
  const article = document.getElementById('article-content');
  if (!article) return;

  const progress = document.querySelector('[data-reader-progress]');
  const controls = document.querySelector('[data-reader-controls]');
  if (controls) {
    controls.hidden = false;
    const buttons = [...controls.querySelectorAll('[data-reading-size]')];
    buttons.forEach(button => button.addEventListener('click', () => {
      const spacious = button.dataset.readingSize === 'spacious';
      document.body.classList.toggle('reading-spacious', spacious);
      buttons.forEach(other => other.setAttribute('aria-pressed',
        String(other.dataset.readingSize === button.dataset.readingSize)));
      schedule();
    }));
  }

  if (!progress) return;
  progress.hidden = false;
  let pending = false;
  function refresh() {
    pending = false;
    const start = article.getBoundingClientRect().top + window.scrollY;
    const height = Math.max(1, article.offsetHeight);
    const finish = start + height;
    const visibleEnd = window.scrollY + Math.min(window.innerHeight * 0.70, 580);
    const fraction = Math.max(0, Math.min(1, (visibleEnd - start) / Math.max(1, finish - start)));
    progress.style.setProperty('--reader-progress', fraction.toFixed(4));
  }
  function schedule() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(refresh);
  }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule, {passive:true});
  window.addEventListener('load', schedule, {once:true});
  schedule();
})();
