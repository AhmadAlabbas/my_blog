'use strict';
(() => {
  const name = 'aa_consent';
  let choice = null;
  const read = () => {
    const value = document.cookie.split('; ').find(part => part.startsWith(name + '='))?.split('=')[1];
    return ['v1.accepted', 'v1.rejected'].includes(value) ? value.slice(3) : null;
  };
  choice = read();
  const banner = document.createElement('section');
  banner.className = 'cookie-banner';
  banner.setAttribute('aria-label', 'Cookie preferences');
  banner.innerHTML = '<div><h2>Your privacy, your choice.</h2><p>We remember your choice using essential storage. Optional cookies stay off unless you accept. YouTube videos load only after you accept and choose Play. No analytics or advertising scripts are installed by this blog. <a href="privacy.html">Privacy details</a></p></div><div class="cookie-actions"><button type="button" data-choice="rejected">Reject</button><button type="button" data-choice="accepted">Accept</button></div>';
  banner.hidden = choice !== null;
  document.body.append(banner);
  const status = document.createElement('span');
  status.className = 'consent-status'; status.setAttribute('role','status');
  document.body.append(status);
  let returnFocus = null;
  const save = value => {
    choice = value;
    document.cookie = `${name}=v1.${value}; Max-Age=15552000; Path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    banner.hidden = true;
    status.textContent = value === 'accepted' ? 'Cookie preference saved: accepted.' : 'Cookie preference saved: rejected.';
    window.dispatchEvent(new CustomEvent('blog:consent', {detail: {choice, optional: choice === 'accepted'}}));
    returnFocus?.focus(); returnFocus = null;
  };
  banner.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => save(button.dataset.choice)));
  document.querySelectorAll('[data-cookie-preferences]').forEach(button => button.addEventListener('click', () => {
    returnFocus = button; banner.hidden = false; banner.querySelector('[data-choice]').focus();
  }));
  window.blogConsent = Object.freeze({get: () => choice, allowsOptional: () => choice === 'accepted'});
})();
