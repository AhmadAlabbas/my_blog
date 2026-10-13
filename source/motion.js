'use strict';
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const deck = document.querySelector('[data-art-deck]');
  if (deck) {
    const slides = [...deck.querySelectorAll('[data-art-slide]')];
    const controls = deck.querySelector('.art-controls');
    const dots = [...deck.querySelectorAll('[data-art-select]')];
    const toggle = deck.querySelector('[data-art-toggle]');
    const caption = deck.querySelector('[data-art-caption]');
    let active = 0, paused = false, hovering = false, focused = false, visible = true, timer;
    controls.hidden = false;
    function show(index) {
      active = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => { slide.classList.toggle('is-active', i === active); slide.setAttribute('aria-hidden', String(i !== active)); });
      dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === active)));
      caption.textContent = slides[active].dataset.caption;
    }
    function schedule() {
      clearTimeout(timer);
      const stopped = paused || reduced.matches;
      toggle.textContent = reduced.matches ? 'Motion off' : (paused ? 'Play' : 'Pause');
      toggle.disabled = reduced.matches;
      toggle.setAttribute('aria-label', stopped ? 'Play artwork slideshow' : 'Pause artwork slideshow');
      if (!stopped && !document.hidden && visible && !hovering && !focused)
        timer = setTimeout(() => { show(active + 1); schedule(); }, 6500);
    }
    dots.forEach((dot, i) => dot.addEventListener('click', () => { show(i); paused = true; schedule(); }));
    toggle.addEventListener('click', () => { paused = !paused; schedule(); });
    deck.addEventListener('mouseenter', () => { hovering = true; schedule(); });
    deck.addEventListener('mouseleave', () => { hovering = false; schedule(); });
    deck.addEventListener('focusin', () => { focused = true; schedule(); });
    deck.addEventListener('focusout', event => { if (!deck.contains(event.relatedTarget)) { focused = false; schedule(); } });
    document.addEventListener('visibilitychange', schedule);
    reduced.addEventListener('change', schedule);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }).observe(deck);
    }
    show(0); schedule();
  }
  // Progressive enhancement: only nearby, below-the-fold sections are hidden,
  // and they are immediately restored when reduced motion is requested.
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); }
    }), { rootMargin: '0px 0px 40px 0px', threshold: 0.05 });
    document.querySelectorAll('main > .section').forEach(section => {
      if (section.getBoundingClientRect().top > innerHeight) { section.classList.add('reveal-section'); observer.observe(section); }
    });
    reduced.addEventListener('change', event => {
      if (event.matches) { document.querySelectorAll('.reveal-section').forEach(x => x.classList.add('is-revealed')); observer.disconnect(); }
    });
  }
})();
// Pause a decorative text ribbon independently of other artwork.
for(const ribbon of document.querySelectorAll('.curiosity-ribbon')){
 const button=ribbon.querySelector('[data-ribbon-toggle]');
 button?.addEventListener('click',()=>{const paused=ribbon.classList.toggle('is-paused');button.setAttribute('aria-pressed',String(paused));button.textContent=document.documentElement.lang==='ar'?(paused?'استأنف الحركة':'أوقف الحركة'):(paused?'Resume motion':'Pause motion');});
}
