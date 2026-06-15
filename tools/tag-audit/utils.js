import { crawl } from 'https://da.live/nx/public/utils/tree.js';

function getOpts(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
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

function parseTagText(text) {
  return text
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

async function fetchDoc(path, token) {
  const resp = await fetch(`https://admin.da.live/source${path}`, getOpts(token));
  if (!resp.ok) return '';
  return resp.text();
}

async function loadPageTags(path, token) {
  const html = await fetchDoc(path, token);
  if (!html) return [];

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const metadataEl = doc.querySelector('.metadata');
  if (!metadataEl) return [];

  const metadata = getMetadataMap(metadataEl);
  if (!metadata.tags) return [];

  return parseTagText(metadata.tags);
}

function mergeTags(items) {
  const tagMap = items.reduce((acc, item) => {
    if (!item.tags?.length) return acc;
    const uniqueTags = [...new Set(item.tags)];

    uniqueTags.forEach((tagName) => {
      if (!acc.has(tagName)) {
        acc.set(tagName, {
          name: tagName,
          pages: [],
          open: false,
        });
      }
      acc.get(tagName).pages.push({
        path: item.path,
        uiPath: item.uiPath,
      });
    });

    return acc;
  }, new Map());

  return [...tagMap.values()]
    .map((tag) => ({
      ...tag,
      pages: tag.pages.sort((a, b) => a.uiPath.localeCompare(b.uiPath)),
    }))
    .sort((a, b) => {
      if (b.pages.length === a.pages.length) return a.name.localeCompare(b.name);
      return b.pages.length - a.pages.length;
    });
}

function isContentHtml(item) {
  if (item.ext !== 'html') return false;
  if (item.path.startsWith('/.')) return false;
  if (item.path.includes('/tools/')) return false;
  return true;
}

export default async function loadTags(path, token, setStatus) {
  const callback = async (item) => {
    if (!isContentHtml(item)) return;
    item.uiPath = item.path.replace('.html', '');
    setStatus(`Loading ${item.uiPath}`);
    item.tags = await loadPageTags(item.path, token);
  };

  const { results } = crawl({
    path,
    callback,
    throttle: 8,
  });

  const pages = await results;
  return mergeTags(pages);
}
