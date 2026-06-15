import DA_SDK from 'https://da.live/nx/utils/sdk.js';
import { LitElement, html, nothing } from '../../deps/lit/dist/index.js';
import loadStyle from '../../scripts/utils/styles.js';
import {
  loadPageTags,
  savePageTags,
  suggestTags,
} from './utils.js';

const styles = await loadStyle(import.meta.url);
const EL_NAME = 'ak-tag-generator';

class AKTagGenerator extends LitElement {
  static properties = {
    path: { attribute: false },
    token: { attribute: false },
    _status: { state: true },
    _error: { state: true },
    _pageTags: { state: true },
    _suggestedTags: { state: true },
  };

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [styles];
    this._pageTags = [];
    this._suggestedTags = undefined;
    this.loadTags();
  }

  async loadTags() {
    if (!this.token) {
      this._error = 'Missing DA token. Make sure you are signed in.';
      return;
    }

    this._status = 'Loading current tags...';
    this._error = undefined;
    try {
      this._pageTags = await loadPageTags(this.path, this.token);
      this._status = undefined;
    } catch (e) {
      this._error = e.message;
      this._status = undefined;
    }
  }

  async generateSuggestions() {
    this._status = 'Generating suggested tags...';
    this._error = undefined;
    try {
      this._suggestedTags = await suggestTags(this.path, this.token);
      this._status = undefined;
    } catch (e) {
      this._error = e.message;
      this._status = undefined;
    }
  }

  async saveSuggestions() {
    if (!this._suggestedTags?.length) return;

    this._status = 'Saving tags...';
    this._error = undefined;
    try {
      const tags = [...new Set([...this._pageTags, ...this._suggestedTags])];
      const result = await savePageTags(this.path, this.token, tags);
      if (result.type !== 'success') {
        this._error = result.message;
      } else {
        this._pageTags = tags;
        this._suggestedTags = undefined;
      }
    } catch (e) {
      this._error = e.message;
    } finally {
      this._status = undefined;
    }
  }

  renderTags(tags, generated = false) {
    if (!tags?.length) return html`<p class="empty">No tags found.</p>`;

    return html`
      <ul class="tag-list">
        ${tags.map((tag) => html`<li class="tag ${generated ? 'generated' : ''}">${tag}</li>`)}
      </ul>
    `;
  }

  renderCurrentTags() {
    return html`
      <section>
        <p class="list-title">Current tags</p>
        ${this.renderTags(this._pageTags)}
      </section>
    `;
  }

  renderGeneratedTags() {
    if (!this._suggestedTags) return nothing;
    return html`
      <section>
        <p class="list-title">Suggested tags</p>
        ${this.renderTags(this._suggestedTags, true)}
      </section>
    `;
  }

  render() {
    return html`
      <main class="panel">
        <h1 class="title">Tag Assistant</h1>
        <p class="subtitle">Generate and save metadata tags for this page.</p>
        ${this._status ? html`<p class="status">${this._status}</p>` : nothing}
        ${this._error ? html`<p class="status">${this._error}</p>` : nothing}
        ${this.renderCurrentTags()}
        ${this.renderGeneratedTags()}
        <div class="actions">
          <button type="button" @click=${() => this.loadTags()} ?disabled=${!!this._status}>Refresh</button>
          <button type="button" class="primary" @click=${() => this.generateSuggestions()} ?disabled=${!!this._status}>
            Suggest tags
          </button>
          <button
            type="button"
            class="primary"
            @click=${() => this.saveSuggestions()}
            ?disabled=${!!this._status || !this._suggestedTags?.length}
          >
            Save tags
          </button>
        </div>
      </main>
    `;
  }
}

customElements.define(EL_NAME, AKTagGenerator);

(async function init() {
  const { context, token } = await DA_SDK;
  const { org, repo, path } = context;

  const cmp = document.createElement(EL_NAME);
  cmp.path = `/${org}/${repo}${path}`;
  cmp.token = token;
  document.body.append(cmp);
}());
