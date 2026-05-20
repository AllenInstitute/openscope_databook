// byline-widget.mjs — per-notebook author byline using native myst-theme CSS classes
// Emits the same HTML structure as AuthorAndAffiliations in @myst-theme/frontmatter

// Inline ORCID icon SVG (matches @scienceicons/react OrcidIcon at 1rem)
const ORCID_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" viewBox="0 0 24 24" fill="currentColor" class="myst-fm-author-icon myst-fm-author-icon-orcid" aria-hidden="true"><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zM7.369 4.378c.525 0 .947.431.947.947s-.422.947-.947.947a.95.95 0 0 1-.947-.947c0-.525.422-.947.947-.947zm-.722 3.038h1.444v10.041H6.647V7.416zm3.562 0h3.9c3.712 0 5.344 2.653 5.344 5.025 0 2.578-2.016 5.016-5.325 5.016h-3.919V7.416zm1.444 1.303v7.444h2.297c3.272 0 3.872-2.922 3.872-3.722 0-2.056-1.263-3.722-3.872-3.722h-2.297z"/></svg>`;

const STYLES = `
.nb-byline .myst-fm-authors-affiliations { margin-top: 1rem; }
.nb-byline .myst-fm-authors-list { display: flex; flex-wrap: wrap; gap: 0 0.75rem; }
.nb-byline .myst-fm-authors-grid { display: grid; grid-template-columns: 1fr 1fr; row-gap: 0.25rem; }
@media (max-width: 640px) { .nb-byline .myst-fm-authors-grid { grid-template-columns: 1fr; } }
.nb-byline .myst-fm-authors-header-authors,
.nb-byline .myst-fm-authors-header-affil { font-size: 0.75rem; font-weight: 100; text-transform: uppercase; padding-bottom: 0.5rem; color: inherit; }
.nb-byline .myst-fm-author { font-weight: 600; font-size: 0.875rem; color: inherit; }
.nb-byline .myst-fm-affiliation-col { font-size: 0.875rem; color: inherit; }
.nb-byline .myst-fm-affiliation-item { color: inherit; }
.nb-byline button.myst-fm-author-popover { all: unset; cursor: pointer; font-weight: 600; color: inherit; }
.nb-byline button.myst-fm-author-popover:hover .myst-fm-author-name { text-decoration: underline; }
.nb-byline .myst-fm-author-icon-link { margin-left: 0.25rem; text-decoration: none; display: inline-block; vertical-align: middle; color: #9ca3af; }
.nb-byline .myst-fm-author-icon { display: inline-block; vertical-align: middle; transform: translateY(-0.1em); color: #9ca3af; }
.nb-byline .myst-fm-author-icon-orcid:hover { color: #A9C751; }
`;

function injectStyles(el) {
  const root = el.getRootNode();
  if (root.querySelector('#nb-byline-styles')) return;
  const style = document.createElement('style');
  style.id = 'nb-byline-styles';
  style.textContent = STYLES;
  (root === document ? document.head : root).appendChild(style);
}

export default {
  render({ model, el }) {
  injectStyles(el);
  let envelope;
  try { envelope = JSON.parse(model.get('authors')); } catch { return; }
  const authors = envelope.primary ?? [];
  if (!authors.length) return;

  const hasAffiliations = authors.some(a => a.affiliations?.length > 0);

  el.innerHTML = '';

  const header = document.createElement('header');
  header.className = 'nb-byline myst-fm-authors-affiliations';

  if (!hasAffiliations) {
    const list = document.createElement('div');
    list.className = 'myst-fm-authors-list';
    for (let i = 0; i < authors.length; i++) {
      list.appendChild(makeAuthorSpan(authors[i], i < authors.length - 1));
    }
    header.appendChild(list);
  } else {
    const grid = document.createElement('div');
    grid.className = 'myst-fm-authors-grid';

    if (authors.length > 1) {
      const hA = document.createElement('div');
      hA.className = 'myst-fm-authors-header-authors';
      hA.textContent = 'Authors';
      const hF = document.createElement('div');
      hF.className = 'myst-fm-authors-header-affil';
      hF.textContent = 'Affiliations';
      grid.appendChild(hA);
      grid.appendChild(hF);
    }

    for (const a of authors) {
      const authorCol = document.createElement('div');
      authorCol.className = 'myst-fm-author-col';
      authorCol.appendChild(makeAuthorSpan(a, false));
      grid.appendChild(authorCol);

      const affCol = document.createElement('div');
      affCol.className = 'myst-fm-affiliation-col';
      for (const aff of (a.affiliations ?? [])) {
        const affDiv = document.createElement('div');
        affDiv.className = 'myst-fm-affiliation-item';
        affDiv.textContent = typeof aff === 'string' ? aff : (aff.name ?? aff.id ?? '');
        affCol.appendChild(affDiv);
      }
      grid.appendChild(affCol);
    }

    header.appendChild(grid);
  }

  el.appendChild(header);
  },
};

function makeAuthorSpan(author, addComma) {
  const span = document.createElement('span');
  span.className = 'myst-fm-author font-semibold text-sm myst-fm-author-item inline-block' +
    (addComma ? ' myst-fm-author-comma text-comma' : '');

  // Popover trigger button (title attribute gives hover tooltip)
  const btn = document.createElement('button');
  btn.className = 'myst-fm-author-popover';
  btn.setAttribute('aria-label', 'Author Details');
  const tip = [];
  if (author.affiliations?.length) {
    tip.push(author.affiliations.map(a => typeof a === 'string' ? a : (a.name ?? '')).join('; '));
  }
  if (author.email) tip.push(author.email);
  if (author.roles?.length) tip.push('Roles: ' + author.roles.join(', '));
  if (tip.length) btn.title = tip.join('\n');

  const nameSpan = document.createElement('span');
  nameSpan.className = 'myst-fm-author-name';
  nameSpan.textContent = author.name ?? author.id;
  btn.appendChild(nameSpan);
  span.appendChild(btn);

  // ORCID icon link
  if (author.orcid) {
    const a = document.createElement('a');
    a.className = 'myst-fm-author-icon-link ml-1';
    a.href = `https://orcid.org/${author.orcid}`;
    a.title = `ORCID: ${author.orcid}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.innerHTML = ORCID_SVG;
    span.appendChild(a);
  }

  // GitHub link (from social_links, only when no ORCID to avoid clutter)
  const ghUrl = author.social_links?.find(l => l.platform === 'github')?.url ?? null;
  const ghUser = author.github ?? (ghUrl ? ghUrl.replace(/.*github\.com\//, '') : null);
  if (ghUser && !author.orcid) {
    const a = document.createElement('a');
    a.className = 'myst-fm-author-icon-link ml-1 text-xs text-gray-400 hover:text-blue-400';
    a.href = `https://github.com/${ghUser}`;
    a.title = `GitHub: ${ghUser}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = `@${ghUser}`;
    span.appendChild(a);
  }

  return span;
}

