import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { LitElement, html, nothing } from 'da-lit';
import loadStyle from '../../scripts/utils/styles.js';
import loadTags from './utils.js';

const styles = await loadStyle(import.meta.url);
const EL_NAME = 'ak-tag-audit';

class AKTagAudit extends LitElement {
  static properties = {
    path: { attribute: false },
    token: { attribute: false },
    _status: { state: true },
    _error: { state: true },
    _tags: { state: true },
  };

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [styles];
    this._tags = undefined;
    this.loadTagAudit();
  }

  async loadTagAudit() {
    if (!this.token) {
      this._error = 'Missing DA token. Make sure you are signed in.';
      return;
    }

    this._status = 'Preparing tag audit...';
    this._error = undefined;
    try {
      const setStatus = (message) => {
        this._status = message;
      };
      this._tags = await loadTags(this.path, this.token, setStatus);
    } catch (e) {
      this._error = e.message;
      this._tags = [];
    } finally {
      this._status = undefined;
    }
  }

  toggleOpen(tag) {
    tag.open = !tag.open;
    this.requestUpdate();
  }

  renderPages(pages) {
    return html`
      <ul class="pages">
        ${pages.map((page) => html`
          <li>
            <a href="https://da.live/edit#${page.uiPath}" target="_blank" rel="noreferrer">
              ${page.uiPath}
            </a>
          </li>
        `)}
      </ul>
    `;
  }

  renderTag(tag) {
    const noun = tag.pages.length === 1 ? 'page' : 'pages';
    return html`
      <li class="tag-item">
        <div class="tag-header">
          <div>
            <p class="name">${tag.name}</p>
            <p class="count">${tag.pages.length} ${noun}</p>
          </div>
          <button type="button" @click=${() => this.toggleOpen(tag)}>
            ${tag.open ? 'Hide pages' : 'View pages'}
          </button>
        </div>
        ${tag.open ? this.renderPages(tag.pages) : nothing}
      </li>
    `;
  }

  renderTags() {
    if (!this._tags?.length) {
      return html`<p class="empty">No tagged pages found.</p>`;
    }

    return html`
      <ul class="tag-list">
        ${this._tags.map((tag) => this.renderTag(tag))}
      </ul>
    `;
  }

  render() {
    return html`
      <main class="app">
        <h1 class="title">Tag Audit</h1>
        <p class="subtitle">Inspect which tags are used across your site content.</p>
        ${this._status ? html`<p class="status">${this._status}</p>` : nothing}
        ${this._error ? html`<p class="status">${this._error}</p>` : nothing}
        ${this.renderTags()}
      </main>
    `;
  }
}

customElements.define(EL_NAME, AKTagAudit);

(async function init() {
  const { context, token } = await DA_SDK;
  const { org, repo } = context;

  const cmp = document.createElement(EL_NAME);
  cmp.path = `/${org}/${repo}`;
  cmp.token = token;
  document.body.append(cmp);
}());
