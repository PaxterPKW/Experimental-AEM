const STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'an', 'and', 'are', 'because', 'been', 'before',
  'being', 'between', 'both', 'but', 'can', 'content', 'could', 'did', 'does', 'during',
  'each', 'for', 'from', 'have', 'here', 'how', 'into', 'its', 'just', 'like',
  'more', 'most', 'new', 'not', 'our', 'out', 'over', 'page', 'should', 'site',
  'some', 'than', 'that', 'the', 'their', 'them', 'there', 'these', 'this', 'those',
  'through', 'under', 'use', 'using', 'was', 'were', 'what', 'when', 'where', 'which',
  'while', 'will', 'with', 'you', 'your',
]);

function getSourcePath(path) {
  return path.endsWith('.html') ? path : `${path}.html`;
}

function getOpts(token, method = 'GET') {
  return {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

async function fetchDoc(path, token) {
  const sourcePath = getSourcePath(path);
  const resp = await fetch(`https://admin.da.live/source${sourcePath}`, getOpts(token));
  if (!resp.ok) {
    throw new Error(`Could not fetch document (${resp.status}).`);
  }

  const html = await resp.text();
  return new DOMParser().parseFromString(html, 'text/html');
}

async function saveDoc(path, token, doc) {
  const sourcePath = getSourcePath(path);
  const body = new FormData();
  const html = doc.body.outerHTML;
  body.append('data', new Blob([html], { type: 'text/html' }));

  const opts = getOpts(token, 'POST');
  opts.body = body;

  const resp = await fetch(`https://admin.da.live/source${sourcePath}`, opts);
  if (!resp.ok) {
    return { type: 'error', message: `Could not save (${resp.status}).` };
  }

  return { type: 'success', message: 'Tags saved successfully.' };
}

function getMetadataMap(metadataEl) {
  return [...metadataEl.children].reduce((acc, row) => {
    if (row.children.length < 2) return acc;
    const key = row.children[0].textContent.trim().toLowerCase();
    const value = row.children[1].textContent.trim();
    if (key) acc[key] = value;
    return acc;
  }, {});
}

function normalizeTag(tag) {
  return tag.trim().toLowerCase();
}

function readTagsFromMetadata(doc) {
  const metadataEl = doc.querySelector('.metadata');
  if (!metadataEl) return [];

  const meta = getMetadataMap(metadataEl);
  if (!meta.tags) return [];

  return meta.tags
    .split(',')
    .map((tag) => normalizeTag(tag))
    .filter(Boolean);
}

function createTagRow(tags) {
  const row = document.createElement('div');
  const key = document.createElement('div');
  const value = document.createElement('div');
  key.textContent = 'tags';
  value.textContent = tags.join(', ');
  row.append(key, value);
  return row;
}

function getOrCreateMetadata(doc) {
  const metadataEl = doc.querySelector('.metadata');
  if (metadataEl) return metadataEl;

  const nextMetadata = document.createElement('div');
  nextMetadata.className = 'metadata';

  const wrapper = doc.querySelector('main > div:last-child') || doc.body;
  wrapper.append(nextMetadata);

  return nextMetadata;
}

function getTagText(pathEl, fallback = '') {
  if (!pathEl) return fallback;
  const text = pathEl.textContent || '';
  return text.toLowerCase().trim();
}

function findKeywordCandidates(doc) {
  const els = doc.querySelectorAll('h1, h2, h3, p');
  const text = [...els].map((el) => getTagText(el)).join(' ');
  const tokens = text
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));

  const score = tokens.reduce((acc, token) => {
    acc[token] = (acc[token] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(score)
    .sort((a, b) => {
      if (b[1] === a[1]) return a[0].localeCompare(b[0]);
      return b[1] - a[1];
    })
    .map(([word]) => word);
}

export async function loadPageTags(path, token) {
  const doc = await fetchDoc(path, token);
  return readTagsFromMetadata(doc);
}

export async function suggestTags(path, token, limit = 10) {
  const doc = await fetchDoc(path, token);
  const currentTags = readTagsFromMetadata(doc);
  const candidates = findKeywordCandidates(doc);
  const seen = new Set(currentTags);
  const suggested = [];

  for (const candidate of candidates) {
    if (!seen.has(candidate)) {
      suggested.push(candidate);
      seen.add(candidate);
      if (suggested.length === limit) break;
    }
  }

  return suggested;
}

export async function savePageTags(path, token, tags) {
  const cleanedTags = tags.map((tag) => normalizeTag(tag)).filter(Boolean);
  const doc = await fetchDoc(path, token);
  const metadataEl = getOrCreateMetadata(doc);
  const rows = [...metadataEl.querySelectorAll(':scope > div')];
  const tagsRow = rows.find((row) => getTagText(row.children[0]) === 'tags');
  const nextTagRow = createTagRow(cleanedTags);

  if (tagsRow) {
    metadataEl.replaceChild(nextTagRow, tagsRow);
  } else {
    metadataEl.append(nextTagRow);
  }

  return saveDoc(path, token, doc);
}
