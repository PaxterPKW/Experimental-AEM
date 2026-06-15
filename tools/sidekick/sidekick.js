import toggleScheduler from '../scheduler/scheduler.js';
import initQuickEdit from '../quick-edit/quick-edit.js';
import toggleTags from '../tag-view/tag-view.js';

function getLocalButton(sk, selector) {
  const theme = sk.shadowRoot.querySelector('theme-wrapper');
  const pab = theme.querySelector('plugin-action-bar');
  const ab = pab.shadowRoot.querySelector('action-bar');
  return ab.querySelector(selector);
}

function localEvent(sk, featName) {
  const btn = getLocalButton(sk, `.${featName}`);
  if (btn) return;
  console.log(`Button for "${featName}" not found. Firing event.`);

  const opts = { detail: true, bubbles: true, composed: true };
  const viewTagsEvent = new CustomEvent(`custom:${featName}`, opts);

  sk.dispatchEvent(viewTagsEvent);
}

function handleLocalDev(sk) {
  // Give SK time to build its shadow DOM.
  setTimeout(() => {
    // Comment out when finished developing
    localEvent(sk, 'view-tags');
  }, 1000);
}

export default async function init(sk) {
  // Handle local development
  const { hostname } = window.location;
  if (hostname === 'localhost') handleLocalDev(sk);

  // Handle button clicks
  sk.addEventListener('custom:scheduler', toggleScheduler);
  sk.addEventListener('custom:quick-edit', initQuickEdit);
  sk.addEventListener('custom:view-tags', toggleTags);

  // Show after all decoration is finished
  sk.classList.add('is-ready');
}

