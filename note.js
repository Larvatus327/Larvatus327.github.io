// Post viewer: loads a Notion-exported post into the page and keeps per-post comments in localStorage.
const config = document.body.dataset;
const json = key => JSON.parse(config[key] || '{}');
const label = new URLSearchParams(location.search).get('label') || '';
const note = document.getElementById('note');

// The label comes from the URL, so only digits may reach the fetch path.
const path = /^\d+$/.test(label) ? json('paths')[label] || `Label/label${label}/label${label}.html` : null;

function fail(message) {
  note.textContent = message;
  document.getElementById('title').textContent = '글을 찾을 수 없습니다';
}

async function loadNote() {
  if (!path) return fail('존재하는 글을 선택해 주세요.');
  const url = new URL(`${config.base}/${path}`, location.origin);
  let doc;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(response.status);
    doc = new DOMParser().parseFromString(await response.text(), 'text/html');
  } catch (error) {
    console.error(error);
    return fail('글을 불러올 수 없습니다.');
  }

  // Exported posts reference images next to themselves.
  for (const [selector, attribute] of [['img', 'src'], ['a', 'href']]) {
    for (const element of doc.querySelectorAll(selector)) {
      const value = element.getAttribute(attribute);
      if (value && !/^(https?:|\/|#|mailto:)/.test(value)) element.setAttribute(attribute, new URL(value, url).href);
    }
  }
  doc.querySelectorAll('img').forEach(image => { image.loading = 'lazy'; image.decoding = 'async'; image.removeAttribute('style'); });
  doc.querySelectorAll('summary').forEach(summary => summary.removeAttribute('style'));
  doc.querySelectorAll('.page-header-icon, .table_of_contents').forEach(element => element.remove());

  const title = (doc.querySelector('.page-title')?.textContent || doc.title).replace(/^\p{Extended_Pictographic}️?\s*/u, '').trim();
  document.getElementById('title').textContent = title;
  document.title = `${title} | Larvatus`;

  const date = json('dates')[label];
  document.querySelectorAll('[data-date]').forEach(element => {
    if (date) { element.textContent = date; element.dateTime = date.replaceAll('.', '-'); }
    else element.closest('[data-date-group]')?.remove();
  });

  const cover = json('covers')[label];
  if (cover) {
    const frame = document.getElementById('cover');
    frame.querySelector('img').src = cover;
    frame.hidden = false;
    doc.querySelector('.page-cover-image')?.remove();
  }

  note.innerHTML = (doc.querySelector('.page-body') || doc.body).innerHTML;

  const headings = [...note.querySelectorAll('h2')].filter(heading => heading.textContent.trim());
  if (headings.length > 1) {
    const toc = document.getElementById('toc');
    headings.forEach((heading, index) => {
      heading.id ||= `section-${index + 1}`;
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent.trim();
      toc.append(link);
    });
    toc.closest('[hidden]').hidden = false;
  }
}

// ---- comments (stored in this browser only)
const storageKey = `${config.storage}${label}`;
const list = document.getElementById('comment-list');
const empty = document.getElementById('comment-empty');
const form = document.getElementById('comment-form');
const readComments = () => { try { return JSON.parse(localStorage.getItem(storageKey)) || []; } catch { return []; } };

function renderComments() {
  const comments = readComments();
  empty.hidden = comments.length > 0;
  list.replaceChildren(...comments.map(({ name, text, time }, index) => {
    const item = document.createElement('li');
    const head = document.createElement('p');
    const author = document.createElement('strong');
    const when = document.createElement('time');
    const body = document.createElement('p');
    const remove = document.createElement('button');
    author.textContent = name;
    when.className = 'mono';
    when.textContent = time ? new Date(time).toLocaleDateString('ko-KR') : '';
    head.className = 'comment-head';
    head.append(author, when);
    body.textContent = text;
    remove.type = 'button';
    remove.className = 'comment-delete';
    remove.textContent = '삭제';
    remove.addEventListener('click', () => {
      const next = readComments();
      next.splice(index, 1);
      localStorage.setItem(storageKey, JSON.stringify(next));
      renderComments();
    });
    item.append(head, body, remove);
    return item;
  }));
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const name = form.elements.name.value.trim();
  const text = form.elements.text.value.trim();
  if (!name || !text) return;
  localStorage.setItem(storageKey, JSON.stringify([...readComments(), { name, text, time: Date.now() }]));
  form.elements.text.value = '';
  renderComments();
});

loadNote();
renderComments();
