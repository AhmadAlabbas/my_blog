'use strict';
// No third-party libraries or trackers. Cookie preferences use essential storage.
const menuButton = document.querySelector('.menu-button');
const mobileMenu = document.getElementById('mobileMenu');
function closeMenu() {
  if (!menuButton || !mobileMenu) return;
  mobileMenu.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.textContent = document.documentElement.lang==='ar'?'القائمة':'Menu';
}
menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.textContent = document.documentElement.lang==='ar'?(open?'إغلاق':'القائمة'):(open?'Close':'Menu');
  mobileMenu.hidden = !open;
});
mobileMenu?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('click',event=>{if(!event.target.closest('.site-header'))closeMenu();});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
    closeMenu(); menuButton.focus();
  }
});
const desktopQuery = window.matchMedia('(min-width: 1001px)');
desktopQuery.addEventListener('change', event => { if (event.matches) closeMenu(); });

// Hostinger forms work natively without JavaScript. Only the static preview is disabled.
const form = document.querySelector('.newsletter-form');
const endpoint = window.SITE_CONFIG?.newsletterAction;
if (form && endpoint) {
 try {
  const url=new URL(endpoint,location.href);
  if(url.protocol==='https:' && !url.username && !url.password){
   form.action=url.href;form.method='post';
   form.querySelector('input[type=email]').disabled=false;
   form.querySelector('button').disabled=false;
   form.querySelector('button').textContent=document.documentElement.lang==='ar'?'اشترك':'Subscribe';
  }
 }catch { /* Keep static-preview signup disabled if not connected. */ }
}
form?.addEventListener('submit',event=>{if(form.querySelector('input[type=email]').disabled || !form.getAttribute('action'))event.preventDefault();});

// Lightweight local search: no network request or visitor data collection.
const normalizeSearch=value=>String(value).normalize('NFKD').replace(/\p{M}/gu,'').replace(/ـ/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').toLowerCase();
const searchDialog = document.querySelector('.search-dialog');
const searchInput = document.querySelector('#search-input');
document.querySelector('[data-open-search]')?.addEventListener('click', () => {
  closeMenu(); searchDialog.showModal(); searchInput.focus();
});
document.querySelector('[data-close-search]')?.addEventListener('click', () => searchDialog.close());
searchDialog?.addEventListener('click', event => { if (event.target === searchDialog) searchDialog.close(); });
searchInput?.addEventListener('input', () => {
  const terms = normalizeSearch(searchInput.value).trim().split(/\s+/);
  let found = 0;
  document.querySelectorAll('.search-result').forEach(result => {
    result.hidden = !terms.every(term => normalizeSearch(result.dataset.search).includes(term));
    if (!result.hidden) found++;
  });
  document.querySelector('.search-empty').hidden = found > 0;
});
// Contact delivery uses an explicitly configured provider-owned form endpoint.
// Keep the submit button disabled until delivery is configured.
const contactForm = document.querySelector('.contact-form');
const contactAction = window.SITE_CONFIG?.contactAction;
if (contactForm && contactAction) {
  try {
    const contactUrl = new URL(contactAction);
    if (contactUrl.protocol === 'https:' && !contactUrl.username && !contactUrl.password) {
      contactForm.action = contactUrl.href;
      contactForm.querySelector('.contact-send').disabled = false;
      contactForm.querySelector('.contact-status').textContent = 'Your details are used privately to respond to your message.';
    }
  } catch { /* An invalid endpoint leaves delivery disabled. */ }
}
contactForm?.addEventListener('submit', event => {
  if (contactForm.querySelector('.contact-send').disabled || !contactForm.getAttribute('action')) {
    event.preventDefault();
  }
});

// Accessible photo journal: progressive links remain usable without JavaScript.
const viewer = document.querySelector('.photo-viewer');
const galleryItems = [...document.querySelectorAll('.gallery-item')];
let activePhoto = 0;
let viewerPhotos = [];
let restorePhotoFocus = null;
function showPhoto(index) {
  if (!viewerPhotos.length) return;
  activePhoto = (index + viewerPhotos.length) % viewerPhotos.length;
  viewer.querySelector('[data-viewer-prev]').hidden = viewerPhotos.length < 2;
  viewer.querySelector('[data-viewer-next]').hidden = viewerPhotos.length < 2;
  viewer.querySelector('.viewer-stage').classList.toggle('single-photo', viewerPhotos.length < 2);
  viewer.querySelector('.viewer-caption span').textContent = viewerPhotos.length < 2 ? 'Select Close to return' : '← → to explore · Esc to close';
  const link = viewerPhotos[activePhoto];
  const img = viewer.querySelector('.viewer-image');
  img.src = link.href;
  img.alt = link.dataset.alt;
  viewer.querySelector('h2').textContent = link.dataset.title;
  viewer.querySelector('.viewer-count').textContent = `${String(activePhoto + 1).padStart(2, '0')} / ${String(viewerPhotos.length).padStart(2, '0')}`;
}
if (viewer) {
  document.querySelectorAll('.gallery-open').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    viewerPhotos = galleryItems.filter(item => !item.hidden).map(item => item.querySelector('.gallery-open'));
    restorePhotoFocus = link;
    showPhoto(viewerPhotos.indexOf(link));
    viewer.showModal();
    document.body.classList.add('viewer-lock');
    viewer.querySelector('[data-viewer-close]').focus();
  }));
  viewer.querySelector('[data-viewer-close]').addEventListener('click', () => viewer.close());
  viewer.querySelector('[data-viewer-prev]').addEventListener('click', () => showPhoto(activePhoto - 1));
  viewer.querySelector('[data-viewer-next]').addEventListener('click', () => showPhoto(activePhoto + 1));
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); showPhoto(activePhoto + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  viewer.addEventListener('close', () => { document.body.classList.remove('viewer-lock'); restorePhotoFocus?.focus(); });
  let startX = null;
  const stage = viewer.querySelector('.viewer-stage');
  stage.addEventListener('touchstart', event => { startX = event.touches[0].clientX; }, {passive:true});
  stage.addEventListener('touchend', event => {
    if (startX === null) return;
    const delta = event.changedTouches[0].clientX - startX;
    if (Math.abs(delta) > 55) showPhoto(activePhoto + (delta < 0 ? 1 : -1));
    startX = null;
  }, {passive:true});
}

document.querySelectorAll('[data-book-filter]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-book-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  document.querySelectorAll('[data-book-group]').forEach(card => {
    const filter = button.dataset.bookFilter;
    card.hidden = filter === 'Bestsellers' ? card.dataset.bestseller !== 'true' : filter !== 'All' && card.dataset.bookGroup !== filter;
  });
  const counter = document.querySelector('[data-book-count]');
  if (counter) {
    const visible = [...document.querySelectorAll('[data-book-group]')].filter(card => !card.hidden).length;
    counter.textContent = `${visible} books · ${button.dataset.bookFilter === 'All' ? 'The complete collection' : button.textContent}`;
  }
}));

// A continuous bookshelf that pauses for interaction, reduced motion, and idle tabs.
document.querySelectorAll('[data-book-carousel]').forEach(carousel => {
  const viewport = carousel.querySelector('[data-book-viewport]');
  const track = carousel.querySelector('.book-carousel-track');
  const group = track?.querySelector('.book-carousel-group');
  const toggle = carousel.querySelector('[data-book-carousel-toggle]');
  if (!viewport || !group || !toggle || group.children.length < 2) return;
  const copy = group.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  copy.dataset.bookClone = '';
  copy.querySelectorAll('a, button, [tabindex]').forEach(node => node.setAttribute('tabindex', '-1'));
  track.append(copy);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let manualPause = reduced.matches;
  let hovering = false, focused = false, touching = false, visible = true;
  let frame = 0, previous = 0, resumeAt = 0;
  const cinema=document.querySelector('.home-cinema');
  const running = () => !manualPause && !hovering && !focused && !touching && visible && !document.hidden && !cinema?.classList.contains('is-paused') && !navigator.connection?.saveData;
  function updateLabel() {
    toggle.textContent = manualPause ? 'Resume scrolling' : 'Pause scrolling';
    toggle.setAttribute('aria-pressed', String(manualPause));
  }
  function tick(now) {
    frame = 0;
    if (!running()) { previous = 0; return; }
    if (previous && now >= resumeAt) {
      const width = group.offsetWidth;
      if (width > 0) viewport.scrollLeft = (viewport.scrollLeft + Math.min(now - previous, 50) * .035) % width;
    }
    previous = now;
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; previous = 0;
    if (running()) frame = requestAnimationFrame(tick);
  }
  toggle.hidden = false;
  updateLabel();
  toggle.addEventListener('click', () => { manualPause = !manualPause; updateLabel(); sync(); });
  viewport.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovering = true; sync(); } });
  viewport.addEventListener('pointerleave', () => { hovering = false; sync(); });
  viewport.addEventListener('focusin', () => { focused = true; sync(); });
  viewport.addEventListener('focusout', event => { focused = viewport.contains(event.relatedTarget); sync(); });
  viewport.addEventListener('pointerdown', () => { touching = true; sync(); }, {passive:true});
  const release = () => { if (touching) { touching = false; resumeAt = performance.now() + 4000; sync(); } };
  window.addEventListener('pointerup', release, {passive:true});
  window.addEventListener('pointercancel', release, {passive:true});
  viewport.addEventListener('wheel', () => { resumeAt = performance.now() + 4000; }, {passive:true});
  reduced.addEventListener('change', () => { manualPause = reduced.matches; updateLabel(); sync(); });
  document.addEventListener('visibilitychange', sync);
  if(cinema)new MutationObserver(sync).observe(cinema,{attributes:true,attributeFilter:['class']});
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(carousel);
  }
  sync();
});
