'use strict';
(() => {
  const row = document.querySelector('.share-row');
  if (!row) return;
  // Share the actual page: the preview URL now, the domain after deployment.
  const page = new URL(location.href);
  page.hash = ''; page.search = '';
  const url = page.href;
  const title = document.querySelector('h1')?.textContent.trim() || document.title;
  const status = row.querySelector('.share-status');
  const say = message => { if (status) status.textContent = message; };
  const providers = {
    LinkedIn: 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url),
    X: 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(title),
    Email: 'mailto:?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(url)
  };
  row.querySelectorAll('a').forEach(link => {
    const href = providers[link.dataset.provider || ({'البريد الإلكتروني':'Email'}[link.textContent.trim()] || link.textContent.trim())];
    if (href) link.href = href;
  });
  const fallback = document.querySelector('.share-fallback');
  if (fallback) {
    const link = fallback.querySelector('a');
    if (link) { link.href = url; link.textContent = url; }
  }
  const dialog = document.createElement('dialog');
  dialog.className = 'share-dialog';
  dialog.setAttribute('aria-labelledby', 'share-title');
  dialog.innerHTML = '<div class="share-dialog-heading"><h2 id="share-title">Pass it on.</h2><button type="button" data-share-close aria-label="Close sharing options">Close ✕</button></div><p>A good idea is worth sharing.</p><label for="share-url">Page link</label><div class="share-input"><input id="share-url" readonly><button type="button" data-share-copy>Copy link</button></div><div class="share-options"></div><p class="share-dialog-status" role="status" aria-live="polite"></p>';
  const input = dialog.querySelector('input'); input.value = url;
  input.addEventListener('click', () => input.select());
  const options = dialog.querySelector('.share-options');
  for (const [label, href] of Object.entries(providers)) {
    const link = document.createElement('a'); link.textContent = label; link.href = href;
    if (label !== 'Email') { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    options.append(link);
  }
  document.body.append(dialog);
  const message = dialog.querySelector('.share-dialog-status');
  let returnFocus;
  function open(trigger) {
    returnFocus = trigger;
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
      input.focus();
    } else {
      if (fallback) fallback.hidden = false;
      say('Select and copy the page link below, or use LinkedIn, X, or Email.');
    }
  }
  dialog.querySelector('[data-share-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => returnFocus?.focus());
  async function copy(trigger) {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); copied = true; }
    } catch { /* Browser policy can block the Clipboard API in a preview. */ }
    if (!copied) {
      open(trigger); input.focus(); input.select();
      try { copied = !!document.execCommand?.('copy'); } catch { /* Keep the selected manual-copy field. */ }
    }
    const text = copied ? 'Link copied.' : 'The link is selected. Press Ctrl+C, ⌘C, or long-press to copy.';
    say(text); message.textContent = text;
  }
  row.querySelector('[data-copy-link]')?.addEventListener('click', event => copy(event.currentTarget));
  dialog.querySelector('[data-share-copy]').addEventListener('click', event => copy(event.currentTarget));
  const share = row.querySelector('[data-native-share]');
  if (share) {
    share.hidden = false;
    share.addEventListener('click', async () => {
      if (typeof navigator.share === 'function') {
        try { await navigator.share({ title, url }); return; }
        catch (error) { if (error.name === 'AbortError') return; }
      }
      open(share);
    });
  }
})();
