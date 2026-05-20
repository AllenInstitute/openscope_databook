// authorship-widget.mjs — Interactive authorship explorer for MyST anywidget
// Vanilla JS implementation (no React/Preact dependency)

// ─── Constants ──────────────────────────────────────────────────

const ALL_CREDIT_ROLES = [
  'Conceptualization', 'Methodology', 'Software', 'Validation',
  'Formal analysis', 'Investigation', 'Resources', 'Data curation',
  'Writing – original draft', 'Writing – review & editing',
  'Visualization', 'Supervision', 'Project Administration', 'Funding Acquisition',
];

const ROLE_ICONS = {
  'Conceptualization': '💡', 'Methodology': '🔬', 'Software': '💻',
  'Validation': '✅', 'Formal analysis': '📊', 'Investigation': '🔍',
  'Resources': '🧰', 'Data curation': '🗄️', 'Writing – original draft': '✍️',
  'Writing – review & editing': '📝', 'Visualization': '📈',
  'Supervision': '👥', 'Project Administration': '📋', 'Funding Acquisition': '💰',
};

const AVATAR_COLORS = [
  '#4f46e5', '#0d9488', '#7c3aed', '#d97706',
  '#e11d48', '#059669', '#1e40af', '#4338ca',
];

const LEVEL_RANK = { lead: 3, equal: 2, supporting: 1 };

// ─── Utilities ──────────────────────────────────────────────────

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}

function getColor(name) {
  return AVATAR_COLORS[hashStr(name) % AVATAR_COLORS.length];
}

function getInitials(name) {
  const parts = name.split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getLastName(name) {
  const parts = name.split(/\s+/);
  return parts[parts.length - 1];
}

function getFirstName(name) {
  const parts = name.split(/\s+/);
  return parts[0];
}

function normalizeRole(r) {
  return r.toLowerCase().replace(/\s+/g, ' ').replace(/—/g, '–').trim();
}

// ─── Avatar helpers (photo or initials fallback) ────────────────

let _avatarClipCounter = 0;

/**
 * Append a circular avatar image (or initials fallback) inside an SVG <g>.
 * If the author has an avatar_url, draws a clipped <image> on top of the
 * existing colored circle so initials show through if the image fails.
 * Otherwise draws initials text.
 */
function appendSvgAvatar(svg, g, ns, x, y, radius, author, fontSize) {
  if (author.avatar_url) {
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS(ns, 'defs');
      svg.insertBefore(defs, svg.firstChild);
    }
    const clipId = `ae-av-${_avatarClipCounter++}`;
    const clipPath = document.createElementNS(ns, 'clipPath');
    clipPath.setAttribute('id', clipId);
    const clipCircle = document.createElementNS(ns, 'circle');
    clipCircle.setAttribute('cx', String(x));
    clipCircle.setAttribute('cy', String(y));
    clipCircle.setAttribute('r', String(radius));
    clipPath.appendChild(clipCircle);
    defs.appendChild(clipPath);

    const img = document.createElementNS(ns, 'image');
    img.setAttribute('href', author.avatar_url);
    img.setAttribute('x', String(x - radius));
    img.setAttribute('y', String(y - radius));
    img.setAttribute('width', String(radius * 2));
    img.setAttribute('height', String(radius * 2));
    img.setAttribute('clip-path', `url(#${clipId})`);
    img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    img.style.pointerEvents = 'none';
    g.appendChild(img);
  } else {
    const init = document.createElementNS(ns, 'text');
    init.setAttribute('x', String(x));
    init.setAttribute('y', String(y + 1));
    init.setAttribute('text-anchor', 'middle');
    init.setAttribute('dominant-baseline', 'central');
    init.setAttribute('fill', '#fff');
    init.setAttribute('font-size', String(fontSize || (radius * 0.55)));
    init.setAttribute('font-weight', '700');
    init.setAttribute('font-family', 'Inter, system-ui, sans-serif');
    init.style.pointerEvents = 'none';
    init.textContent = getInitials(author.name);
    g.appendChild(init);
  }
}

/**
 * Build an HTML avatar element — circular <img> or colored div with initials.
 */
function buildHtmlAvatar(author, className, extraStyle) {
  const color = getColor(author.name);
  if (author.avatar_url) {
    const wrapper = el('div', {
      className: className,
      style: { ...extraStyle, padding: '0', overflow: 'hidden' },
    });
    const img = el('img', {
      src: author.avatar_url,
      alt: author.name,
      style: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' },
    });
    img.onerror = () => {
      wrapper.textContent = getInitials(author.name);
      wrapper.style.backgroundColor = color;
      wrapper.style.overflow = '';
    };
    wrapper.appendChild(img);
    return wrapper;
  }
  return el('div', {
    className: className,
    style: { backgroundColor: color, ...extraStyle },
  }, getInitials(author.name));
}

function rolesMatch(a, b) {
  return normalizeRole(a) === normalizeRole(b);
}

function findCreditLevel(author, roleName) {
  if (!author.credit_levels) return null;
  const found = author.credit_levels.find(cl => rolesMatch(cl.role, roleName));
  return found ? found.level : null;
}

function el(tag, attrs, ...children) {
  const e = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'className') e.className = v;
      else if (k === 'innerHTML') e.innerHTML = v;
      else e.setAttribute(k, v);
    }
  }
  for (const c of children) {
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else if (c) e.appendChild(c);
  }
  return e;
}

// ─── Author hover popover ───────────────────────────────────────

let _popoverEl = null;
let _popoverTimeout = null;
let _popoverStyleInjected = false;

function ensurePopoverStyles() {
  if (_popoverStyleInjected) return;
  _popoverStyleInjected = true;
  const style = document.createElement('style');
  style.id = 'ae-popover-styles';
  style.textContent = `
    .ae-popover {
      position: fixed; z-index: 10000; width: 260px;
      background: rgba(255,255,255,0.97); backdrop-filter: blur(12px);
      border: 1px solid #e5e7eb; border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
      padding: 12px; font-family: 'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      font-size: 12px; color: #111827; pointer-events: auto;
      animation: ae-pop-in 0.15s ease-out;
    }
    @keyframes ae-pop-in { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
    .ae-popover-header { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
    .ae-popover-avatar { width:32px; height:32px; border-radius:50%; color:#fff; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .ae-popover-info { min-width:0; }
    .ae-popover-name { font-size:13px; font-weight:600; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .ae-popover-stage { font-size:11px; color:#6b7280; }
    .ae-popover-aff { font-size:11px; color:#6b7280; line-height:1.3; margin-bottom:8px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .ae-popover-roles { display:flex; flex-wrap:wrap; gap:3px; margin-bottom:6px; }
    .ae-popover-role { padding:2px 6px; border-radius:8px; font-size:10px; font-weight:500; color:#fff; white-space:nowrap; }
    .ae-popover-role-lead { background:#4338ca; }
    .ae-popover-role-equal { background:#a5b4fc; color:#312e81; }
    .ae-popover-role-supporting { background:#e5e7eb; color:#4b5563; }
    .ae-popover-role-more { background:#f3f4f6; color:#6b7280; }
    .ae-popover-stats { display:flex; gap:12px; font-size:10px; color:#9ca3af; border-top:1px solid #f3f4f6; padding-top:6px; }
    @media (prefers-reduced-motion:reduce) { .ae-popover { animation:none; } }
    html[data-theme="dark"] .ae-popover { background:rgba(31,41,55,0.97); border-color:#4b5563; box-shadow:0 8px 24px rgba(0,0,0,0.3),0 2px 8px rgba(0,0,0,0.2); color:#e5e7eb; }
    html[data-theme="dark"] .ae-popover-name { color:#f3f4f6; }
    html[data-theme="dark"] .ae-popover-stage { color:#9ca3af; }
    html[data-theme="dark"] .ae-popover-aff { color:#9ca3af; }
    html[data-theme="dark"] .ae-popover-role-equal { background:#4338ca; color:#c7d2fe; }
    html[data-theme="dark"] .ae-popover-role-supporting { background:#4b5563; color:#d1d5db; }
    html[data-theme="dark"] .ae-popover-role-more { background:#374151; color:#9ca3af; }
    html[data-theme="dark"] .ae-popover-stats { color:#9ca3af; border-top-color:#374151; }
  `;
  document.head.appendChild(style);
}

function attachAuthorPopover(element, author) {
  element.style.cursor = 'pointer';
  element.addEventListener('mouseenter', () => {
    clearTimeout(_popoverTimeout);
    _popoverTimeout = setTimeout(() => {
      if (element.isConnected) showPopover(element, author);
    }, 250);
  });
  element.addEventListener('mouseleave', () => {
    clearTimeout(_popoverTimeout);
    _popoverTimeout = setTimeout(hidePopover, 200);
  });
}

function showPopover(anchor, author) {
  hidePopover();
  ensurePopoverStyles();
  const color = getColor(author.name);
  const pop = el('div', { className: 'ae-popover' });
  pop.addEventListener('mouseenter', () => clearTimeout(_popoverTimeout));
  pop.addEventListener('mouseleave', () => {
    clearTimeout(_popoverTimeout);
    _popoverTimeout = setTimeout(hidePopover, 150);
  });

  // Header: avatar + name + career stage
  const header = el('div', { className: 'ae-popover-header' });
  header.appendChild(buildHtmlAvatar(author, 'ae-popover-avatar'));
  const info = el('div', { className: 'ae-popover-info' });
  info.appendChild(el('div', { className: 'ae-popover-name' }, author.name));
  if (author.career_stage) {
    info.appendChild(el('div', { className: 'ae-popover-stage' }, author.career_stage));
  }
  header.appendChild(info);
  pop.appendChild(header);

  // Affiliations
  if (author.affiliations?.length) {
    const affText = author.affiliations
      .map(a => typeof a === 'string' ? a : (a.name || a))
      .join(' · ');
    pop.appendChild(el('div', { className: 'ae-popover-aff' }, affText));
  }

  // CRediT roles
  const credits = author.credit_levels || [];
  if (credits.length) {
    const badges = el('div', { className: 'ae-popover-roles' });
    for (const cr of credits) {
      badges.appendChild(el('span', {
        className: `ae-popover-role ae-popover-role-${cr.level}`,
      }, cr.role.replace('Writing – ', 'W: ').replace('Formal ', 'F. ')));
    }
    pop.appendChild(badges);
  }

  // Stats row
  const secs = (author.section_contributions || []).length;
  const figs = (author.figure_contributions || []).length;
  if (credits.length || secs || figs) {
    const stats = el('div', { className: 'ae-popover-stats' });
    if (credits.length) stats.appendChild(el('span', {}, `${credits.length} roles`));
    if (secs) stats.appendChild(el('span', {}, `${secs} sections`));
    if (figs) stats.appendChild(el('span', {}, `${figs} figures`));
    pop.appendChild(stats);
  }

  document.body.appendChild(pop);
  _popoverEl = pop;

  // Position relative to anchor
  const rect = anchor.getBoundingClientRect();
  const popRect = pop.getBoundingClientRect();
  let top = rect.bottom + 6;
  let left = rect.left + rect.width / 2 - popRect.width / 2;

  // Keep within viewport
  if (left < 8) left = 8;
  if (left + popRect.width > window.innerWidth - 8) left = window.innerWidth - 8 - popRect.width;
  if (top + popRect.height > window.innerHeight - 8) {
    top = rect.top - popRect.height - 6;
  }

  pop.style.top = top + 'px';
  pop.style.left = left + 'px';
}

function hidePopover() {
  if (_popoverEl) {
    _popoverEl.remove();
    _popoverEl = null;
  }
}

// ─── Sort logic ─────────────────────────────────────────────────

function sortAuthors(authors, sortKey) {
  const sorted = [...authors];

  if (sortKey.startsWith('credit:')) {
    const roleName = sortKey.slice(7);
    return sorted.sort((a, b) => {
      const aRank = LEVEL_RANK[findCreditLevel(a, roleName)] || 0;
      const bRank = LEVEL_RANK[findCreditLevel(b, roleName)] || 0;
      if (bRank !== aRank) return bRank - aRank;
      return getLastName(a.name).localeCompare(getLastName(b.name));
    });
  }

  switch (sortKey) {
    case 'alpha':
      return sorted.sort((a, b) => getLastName(a.name).localeCompare(getLastName(b.name)));
    case 'most-roles':
      return sorted.sort((a, b) => (b.credit_levels?.length || 0) - (a.credit_levels?.length || 0));
    case 'joined-first':
      return sorted.sort((a, b) => (a.timeline?.joined || '9999').localeCompare(b.timeline?.joined || '9999'));
    default:
      return sorted;
  }
}

// ─── Main render ────────────────────────────────────────────────

function render({ model, el: rootEl }) {
  const authorsRaw = model.get('authors');
  const parsed = typeof authorsRaw === 'string' ? JSON.parse(authorsRaw) : authorsRaw;

  // Section labels from document headings (built by plugin)
  const sectionLabelsRaw = model.get('sectionLabels');
  const sectionLabels = sectionLabelsRaw
    ? (typeof sectionLabelsRaw === 'string' ? JSON.parse(sectionLabelsRaw) : sectionLabelsRaw)
    : {};

  function sectionLabel(id) {
    return sectionLabels[id] || id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // Unpack envelope: { primary: [...], alt?: [...], alt2?: [...] }
  // or fall back to legacy flat array format
  let authors, authorsAlt, altLabel, authorsAlt2, alt2Label;
  if (Array.isArray(parsed)) {
    authors = parsed;
    authorsAlt = null;
    altLabel = 'Simulated large team';
    authorsAlt2 = null;
    alt2Label = 'Real contributors';
  } else {
    authors = parsed.primary || [];
    authorsAlt = parsed.alt || null;
    altLabel = parsed.altLabel || 'Simulated large team';
    authorsAlt2 = parsed.alt2 || null;
    alt2Label = parsed.alt2Label || 'Real contributors';
  }
  const sourceFiles = parsed.sourceFiles || [];
  const hasToggle = !!(authorsAlt && authorsAlt.length) || !!(authorsAlt2 && authorsAlt2.length);

  if (!authors || !authors.length) {
    rootEl.appendChild(el('p', {}, 'No author data available.'));
    return;
  }

  // Hide the default MyST author/affiliation grid and move widget into frontmatter
  const hostDoc = rootEl.getRootNode() === rootEl.ownerDocument
    ? rootEl.ownerDocument
    : rootEl.getRootNode()?.host?.ownerDocument || document;
  if (!hostDoc.getElementById('ae-hide-default-authors')) {
    const hideStyle = hostDoc.createElement('style');
    hideStyle.id = 'ae-hide-default-authors';
    hideStyle.textContent = '.myst-fm-authors-affiliations { display: none !important; }';
    hostDoc.head.appendChild(hideStyle);
  }

  // Move widget host element into frontmatter, between title and abstract
  const shadowHost = rootEl.getRootNode()?.host;
  if (shadowHost) {
    const fmTitle = hostDoc.querySelector('.myst-fm-block-title');
    const fmAbstract = hostDoc.querySelector('.myst-fm-parts, .myst-abstract');
    const fmDateDoi = hostDoc.querySelector('.myst-fm-block-date-doi');
    const insertBefore = fmDateDoi || fmAbstract;
    if (fmTitle && insertBefore && !shadowHost.dataset.aeMoved) {
      shadowHost.dataset.aeMoved = '1';
      insertBefore.parentNode.insertBefore(shadowHost, insertBefore);
    }
  }

  // ── Dark mode detection ──
  function detectDarkMode() {
    const html = hostDoc.documentElement;
    if (html.getAttribute('data-theme') === 'dark') return true;
    if (html.classList.contains('dark')) return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  let isDark = detectDarkMode();

  // Watch for dark mode changes (MyST toggle sets data-theme on <html>)
  const _darkObserver = new MutationObserver(() => {
    const wasDark = isDark;
    isDark = detectDarkMode();
    if (wasDark !== isDark) rerender();
  });
  _darkObserver.observe(hostDoc.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

  const _darkMql = window.matchMedia('(prefers-color-scheme: dark)');
  const _darkMqlHandler = () => {
    const wasDark = isDark;
    isDark = detectDarkMode();
    if (wasDark !== isDark) rerender();
  };
  _darkMql.addEventListener('change', _darkMqlHandler);

  // State
  let sortKey = 'alpha';
  let expanded = false;
  let activeTab = 'network';
  let showCreditMenu = false;
  let authorMode = 'simulated'; // 'simulated' or 'real'
  let networkMode = 'collab'; // 'collab' | 'flow' | 'institutions' | 'force' | 'sections'
  let searchQuery = ''; // search/filter across all views
  let cachedLayout = null; // { key, positions: [{x,y}] } — shared between Network & Flow

  // Search highlight: matches name, institution, or CRediT role
  function matchesSearch(author, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    if (author.name.toLowerCase().includes(q)) return true;
    if (author.affiliations) {
      for (const aff of author.affiliations) {
        const affStr = typeof aff === 'string' ? aff : (aff.name || aff.id || '');
        if (affStr.toLowerCase().includes(q)) return true;
      }
    }
    if (author.credit_levels) {
      for (const cl of author.credit_levels) {
        if (cl.role.toLowerCase().includes(q)) return true;
      }
    }
    if (author.career_stage && author.career_stage.toLowerCase().includes(q)) return true;
    return false;
  }

  // Returns a Set of indices into the sorted array that match search
  function getHighlightedSet(authors) {
    if (!searchQuery) return null; // null = no highlighting, show all normally
    const set = new Set();
    for (let i = 0; i < authors.length; i++) {
      if (matchesSearch(authors[i], searchQuery)) set.add(i);
    }
    return set;
  }

  function rerender() {
    // Build new content first, then swap to avoid flash/blink
    const newWidget = buildWidget();
    const oldWidget = rootEl.querySelector('.ae-widget');
    if (oldWidget) {
      oldWidget.replaceWith(newWidget);
    } else {
      const preserved = [...rootEl.querySelectorAll('link[rel="stylesheet"], style')];
      rootEl.innerHTML = '';
      preserved.forEach(n => rootEl.appendChild(n));
      rootEl.appendChild(newWidget);
    }
  }

  function getActiveAuthors() {
    if (authorMode === 'large') return authorsAlt || authors;
    if (authorMode === 'real') return authorsAlt2 || authors;
    return authors;
  }

  // GitHub source URL base (derive from repo)
  const REPO_URL = 'https://github.com/AllenNeuralDynamics/AuthorshipExtractor';

  function buildWidget() {
    const activeAuthors = getActiveAuthors();
    const sorted = sortAuthors(activeAuthors, sortKey);
    const highlightSet = getHighlightedSet(sorted); // null if no search

    const container = el('div', { className: `ae-widget ${expanded ? '' : 'ae-collapsed'} ${isDark ? 'ae-dark' : ''}` });

    // ──── Collapsed state: compact header ────
    if (!expanded) {
      const header = el('div', { className: 'ae-collapsed-header', onClick: () => { expanded = true; rerender(); } });

      // Summary info (no names to avoid implying ordering)
      const info = el('div', { className: 'ae-collapsed-info' });
      info.appendChild(el('span', { className: 'ae-collapsed-title' }, `${sorted.length} Contributor${sorted.length === 1 ? '' : 's'}`));

      const instCount = new Set(sorted.flatMap(a => (a.affiliations || []).map(aff =>
        typeof aff === 'string' ? aff : (aff.id || aff.name || '')
      ))).size;
      if (instCount) {
        info.appendChild(el('span', { className: 'ae-collapsed-subtitle' }, `${instCount} institution${instCount > 1 ? 's' : ''}`));
      }
      header.appendChild(info);

      // Expand button
      header.appendChild(el('button', {
        className: 'ae-expand-btn',
        onClick: (e) => { e.stopPropagation(); expanded = true; rerender(); },
      }, '▾ Explore'));
      container.appendChild(header);

      return container;
    }

    // ──── Expanded state ────

    // ──── Dataset toggle ────
    if (hasToggle) {
      const toggle = el('div', { className: 'ae-mode-toggle' });
      toggle.appendChild(el('button', {
        className: `ae-mode-btn ${authorMode === 'simulated' ? 'ae-mode-active' : ''}`,
        onClick: () => { authorMode = 'simulated'; sortKey = 'alpha'; rerender(); },
      }, 'Simulated small team'));
      if (authorsAlt && authorsAlt.length) {
        toggle.appendChild(el('button', {
          className: `ae-mode-btn ${authorMode === 'large' ? 'ae-mode-active' : ''}`,
          onClick: () => { authorMode = 'large'; sortKey = 'alpha'; rerender(); },
        }, altLabel));
      }
      if (authorsAlt2 && authorsAlt2.length) {
        toggle.appendChild(el('button', {
          className: `ae-mode-btn ${authorMode === 'real' ? 'ae-mode-active' : ''}`,
          onClick: () => { authorMode = 'real'; sortKey = 'alpha'; rerender(); },
        }, alt2Label));
      }
      container.appendChild(toggle);

      // Disclaimer for simulated modes
      if (authorMode === 'simulated' || authorMode === 'large') {
        container.appendChild(el('p', { className: 'ae-mode-note' },
          'The simulated team and their contributions are fictional, for demonstration purposes only.'));
      }
    }

    // ──── Title ────
    const matchCount = highlightSet ? highlightSet.size : sorted.length;
    const countLabel = searchQuery
      ? `${matchCount} of ${sorted.length} highlighted`
      : `${sorted.length} authors`;
    const titleBar = el('div', { className: 'ae-title-bar' },
      el('h3', { className: 'ae-title' }, 'Contributors'),
      el('span', { className: 'ae-title-count' }, countLabel),
      el('button', {
        className: 'ae-collapse-btn',
        onClick: () => { expanded = false; rerender(); },
        title: 'Collapse',
      }, '▴ Collapse'),
    );
    container.appendChild(titleBar);

    // ──── Panel (always visible) ────
    const panel = el('div', { className: 'ae-panel' });

    // Tabs
    const tabs = el('div', { className: 'ae-tabs', role: 'tablist', 'aria-label': 'Authorship views' });
    const tabDefs = [
      { id: 'network', label: 'Collaboration' },
      { id: 'matrix', label: 'CRediT' },
      { id: 'sections', label: 'Sections' },
      { id: 'timeline', label: 'Timeline' },
      { id: 'authors', label: 'Sorted List' },
      { id: 'profiles', label: 'Profiles' },
    ];
    for (let ti = 0; ti < tabDefs.length; ti++) {
      const t = tabDefs[ti];
      const isActive = activeTab === t.id;
      const tabBtn = el('button', {
        className: `ae-tab ${isActive ? 'ae-tab-active' : ''}`,
        role: 'tab',
        'aria-selected': String(isActive),
        tabindex: isActive ? '0' : '-1',
        onClick: () => { activeTab = t.id; rerender(); },
      }, t.label);
      tabBtn.addEventListener('keydown', (e) => {
        let next = -1;
        if (e.key === 'ArrowRight') next = (ti + 1) % tabDefs.length;
        else if (e.key === 'ArrowLeft') next = (ti - 1 + tabDefs.length) % tabDefs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabDefs.length - 1;
        if (next >= 0) {
          e.preventDefault();
          activeTab = tabDefs[next].id;
          rerender();
          // Focus the new active tab after rerender
          requestAnimationFrame(() => {
            const newTab = rootEl.querySelector('.ae-tab-active');
            if (newTab) newTab.focus();
          });
        }
      });
      tabs.appendChild(tabBtn);
    }
    panel.appendChild(tabs);

    // Search bar
    const searchBar = el('div', { className: 'ae-search-bar' });
    const searchInput = el('input', {
      className: 'ae-search-input',
      type: 'text',
      placeholder: 'Filter by name, institution, or role…',
      'aria-label': 'Filter contributors',
    });
    searchInput.value = searchQuery;
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      rerender();
      // Restore focus to search input after rerender
      requestAnimationFrame(() => {
        const inp = rootEl.querySelector('.ae-search-input');
        if (inp) { inp.focus(); inp.selectionStart = inp.selectionEnd = inp.value.length; }
      });
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchQuery = '';
        rerender();
      }
    });
    searchBar.appendChild(el('span', { className: 'ae-search-icon', 'aria-hidden': 'true' }, '🔍'));
    searchBar.appendChild(searchInput);
    if (searchQuery) {
      searchBar.appendChild(el('button', {
        className: 'ae-search-clear',
        onClick: () => { searchQuery = ''; rerender(); },
        'aria-label': 'Clear search',
        title: 'Clear',
      }, '×'));
    }
    panel.appendChild(searchBar);

    // Tab content
    const content = el('div', { className: 'ae-tab-content', role: 'tabpanel' });

    if (sorted.length === 0) {
      content.appendChild(el('p', { className: 'ae-empty' }, 'No contributor data available.'));
    } else if (activeTab === 'authors') {
      content.appendChild(buildAuthorListTab());
    } else if (activeTab === 'network') {
      content.appendChild(buildNetworkTab(sorted, highlightSet));
    } else if (activeTab === 'profiles') {
      content.appendChild(buildProfilesTab(sorted));
    } else if (activeTab === 'matrix') {
      content.appendChild(buildMatrixTab(sorted));
    } else if (activeTab === 'sections') {
      content.appendChild(buildSectionsTab(sorted));
    } else if (activeTab === 'timeline') {
      content.appendChild(buildTimelineTab(sorted));
    }

    panel.appendChild(content);
    container.appendChild(panel);

    // Source config links
    if (sourceFiles.length) {
      const srcRow = el('div', { className: 'ae-source-links ae-source-links-expanded' });
      srcRow.appendChild(el('span', { className: 'ae-source-label' }, '📄 Config:'));
      for (const f of sourceFiles) {
        const name = f.replace('./', '');
        srcRow.appendChild(el('a', {
          href: `${REPO_URL}/blob/main/${name}`,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'ae-source-link',
        }, name));
      }
      container.appendChild(srcRow);
    }

    return container;
  }

  // ──── Author List tab ────
  function buildAuthorListTab() {
    const activeAuthors = getActiveAuthors();
    const isCreditSort = sortKey.startsWith('credit:');
    const resorted = sortAuthors(activeAuthors, sortKey);
    const wrap = el('div', { className: 'ae-author-list-tab' });

    // Sort bar
    const sortBar = el('div', { className: 'ae-sort-bar' });

    const sortHeader = el('div', { className: 'ae-sort-header' },
      el('span', { className: 'ae-label' }, 'Authors'),
      el('span', { className: 'ae-count' }, String(activeAuthors.length)),
      el('span', { className: 'ae-sep' }, '|'),
      el('span', { className: 'ae-sublabel' }, 'Order by:'),
    );
    sortBar.appendChild(sortHeader);

    const chips = el('div', { className: 'ae-chips' });

    // A→Z chip
    chips.appendChild(el('button', {
      className: `ae-chip ${sortKey === 'alpha' ? 'ae-chip-active' : ''}`,
      onClick: () => { sortKey = 'alpha'; rerender(); },
    }, '🔤 A → Z'));

    // CRediT Role dropdown
    const creditWrap = el('div', { className: 'ae-credit-wrap' });
    const creditBtn = el('button', {
      className: `ae-chip ${isCreditSort ? 'ae-chip-active' : ''}`,
      onClick: () => { showCreditMenu = !showCreditMenu; rerender(); },
    }, '🏷️ CRediT Role ▾');
    creditWrap.appendChild(creditBtn);

    if (showCreditMenu) {
      const menu = el('div', { className: 'ae-credit-menu ae-credit-menu-fixed' });
      menu.appendChild(el('div', { className: 'ae-credit-menu-title' }, 'Sort by specific CRediT role'));
      for (const role of ALL_CREDIT_ROLES) {
        const key = `credit:${role}`;
        const icon = ROLE_ICONS[role] || '🏷️';
        const isActive = sortKey === key;
        const item = el('button', {
          className: `ae-credit-item ${isActive ? 'ae-credit-item-active' : ''}`,
          onClick: () => { sortKey = key; showCreditMenu = false; rerender(); },
        },
          el('span', { className: 'ae-credit-icon' }, icon),
          el('span', {}, role),
          isActive ? el('span', { className: 'ae-check' }, '✓') : null,
        );
        menu.appendChild(item);
      }
      creditWrap.appendChild(menu);
      // Position the menu after it's in the DOM
      requestAnimationFrame(() => {
        const btnRect = creditBtn.getBoundingClientRect();
        menu.style.top = (btnRect.bottom + 4) + 'px';
        menu.style.left = btnRect.left + 'px';
      });
      const backdrop = el('div', { className: 'ae-backdrop', onClick: () => { showCreditMenu = false; rerender(); } });
      creditWrap.appendChild(backdrop);
    }
    chips.appendChild(creditWrap);

    // Most roles
    chips.appendChild(el('button', {
      className: `ae-chip ${sortKey === 'most-roles' ? 'ae-chip-active' : ''}`,
      onClick: () => { sortKey = 'most-roles'; rerender(); },
    }, '🏷️ Most roles'));

    // Joined first
    chips.appendChild(el('button', {
      className: `ae-chip ${sortKey === 'joined-first' ? 'ae-chip-active' : ''}`,
      onClick: () => { sortKey = 'joined-first'; rerender(); },
    }, '⏳ Joined first'));

    // Institution
    chips.appendChild(el('button', {
      className: `ae-chip ${sortKey === 'institution' ? 'ae-chip-active' : ''}`,
      onClick: () => { sortKey = 'institution'; rerender(); },
    }, '🏛️ Institution'));

    sortBar.appendChild(chips);

    // Sort description
    let sortDesc = 'Alphabetical by last name';
    if (sortKey === 'most-roles') sortDesc = 'By number of CRediT roles';
    else if (sortKey === 'joined-first') sortDesc = 'By project join date (earliest first)';
    else if (sortKey === 'institution') sortDesc = 'Grouped by institution — numbers indicate affiliated authors';
    else if (isCreditSort) sortDesc = `By "${sortKey.slice(7)}" — lead → equal → supporting → none`;
    sortBar.appendChild(el('p', { className: 'ae-sort-desc' }, `Sorted: ${sortDesc}`));

    wrap.appendChild(sortBar);

    // Build unique affiliation list with indices
    const affList = []; // [{name, dept, id}]
    const affIndexMap = new Map(); // affiliation key -> 1-based index
    function getAffKey(aff) {
      if (typeof aff === 'string') return aff;
      return aff.id || aff.name || JSON.stringify(aff);
    }
    function getAffLabel(aff) {
      if (typeof aff === 'string') return aff;
      let label = aff.name || aff.id || '';
      if (aff.department) label = `${aff.department}, ${label}`;
      if (aff.city) label += `, ${aff.city}`;
      if (aff.country) label += `, ${aff.country}`;
      return label;
    }

    // Build author index (1-based) for institution view
    const authorIndex = new Map(); // author name -> 1-based index
    resorted.forEach((author, i) => {
      authorIndex.set(author.name, i + 1);
      if (!author.affiliations) return;
      author.affiliations.forEach(aff => {
        const key = getAffKey(aff);
        if (!affIndexMap.has(key)) {
          affIndexMap.set(key, affList.length + 1);
          affList.push(aff);
        }
      });
    });

    if (sortKey === 'institution') {
      // ── Institution view: institutions listed, author numbers as superscripts ──

      // Build institution -> authors mapping
      const instAuthors = new Map(); // affKey -> [author, ...]
      resorted.forEach(author => {
        if (!author.affiliations?.length) return;
        author.affiliations.forEach(aff => {
          const key = getAffKey(aff);
          if (!instAuthors.has(key)) instAuthors.set(key, []);
          instAuthors.get(key).push(author);
        });
      });
      // Authors with no affiliation
      const unaffiliated = resorted.filter(a => !a.affiliations?.length);

      // Numbered author key at the top
      const authorKeyDiv = el('div', { className: 'ae-names' });
      resorted.forEach((author, i) => {
        const isLast = i === resorted.length - 1;
        const isDimmed = searchQuery && !matchesSearch(author, searchQuery);
        const span = el('span', { className: 'ae-name-wrap' });
        if (isDimmed) span.style.opacity = '0.3';
        span.appendChild(el('sup', { className: 'ae-aff-sup' }, String(i + 1)));
        const nameEl = el('button', { className: 'ae-name' }, author.name);
        attachAuthorPopover(nameEl, author);
        span.appendChild(nameEl);
        if (author.corresponding) {
          span.appendChild(el('span', { className: 'ae-corresponding', title: 'Corresponding author' }, '✉'));
        }
        if (!isLast) span.appendChild(el('span', { className: 'ae-comma' }, ', '));
        authorKeyDiv.appendChild(span);
      });
      wrap.appendChild(authorKeyDiv);

      // Institution list with author numbers
      const instDiv = el('div', { className: 'ae-affiliations ae-aff-numbered' });
      for (const [affKey, authors] of instAuthors) {
        const aff = affList.find(a => getAffKey(a) === affKey);
        const line = el('div', { className: 'ae-aff-line ae-inst-line' });
        line.appendChild(el('span', { className: 'ae-inst-name' }, getAffLabel(aff || affKey)));
        const nums = authors.map(a => authorIndex.get(a.name)).filter(Boolean).sort((a, b) => a - b);
        if (nums.length) {
          line.appendChild(el('sup', { className: 'ae-aff-sup' }, nums.join(',')));
        }
        instDiv.appendChild(line);
      }
      if (unaffiliated.length) {
        const line = el('div', { className: 'ae-aff-line ae-inst-line' });
        line.appendChild(el('span', { className: 'ae-inst-name' }, 'No affiliation'));
        const nums = unaffiliated.map(a => authorIndex.get(a.name)).filter(Boolean);
        line.appendChild(el('sup', { className: 'ae-aff-sup' }, nums.join(',')));
        instDiv.appendChild(line);
      }
      wrap.appendChild(instDiv);

    } else {
      // ── Standard author view ──

      // Author names with superscript affiliation numbers
      const namesList = el('div', { className: 'ae-names' });
      resorted.forEach((author, i) => {
        const isLast = i === resorted.length - 1;
        const isDimmed = searchQuery && !matchesSearch(author, searchQuery);
        const span = el('span', { className: 'ae-name-wrap' });
        if (isDimmed) span.style.opacity = '0.3';

        const nameBtn = el('button', { className: 'ae-name' }, author.name);
        attachAuthorPopover(nameBtn, author);
        span.appendChild(nameBtn);

        // Superscript affiliation numbers
        if (author.affiliations?.length && affList.length > 0) {
          const indices = author.affiliations.map(aff => affIndexMap.get(getAffKey(aff))).filter(Boolean);
          if (indices.length) {
            span.appendChild(el('sup', { className: 'ae-aff-sup' }, indices.join(',')));
          }
        }

        if (isCreditSort) {
          const level = findCreditLevel(author, sortKey.slice(7));
          if (level) {
            const badge = el('span', {
              className: `ae-level-badge ae-level-${level}`,
            }, level === 'lead' ? 'L' : level === 'equal' ? 'E' : 'S');
            span.appendChild(badge);
          }
        }

        if (author.corresponding) {
          span.appendChild(el('span', { className: 'ae-corresponding', title: 'Corresponding author' }, '✉'));
        }

        if (!isLast) span.appendChild(el('span', { className: 'ae-comma' }, ', '));
        namesList.appendChild(span);
      });
      wrap.appendChild(namesList);

      // Numbered affiliations list
      if (affList.length) {
        const affDiv = el('div', { className: 'ae-affiliations ae-aff-numbered' });
        affList.forEach((aff, idx) => {
          const line = el('div', { className: 'ae-aff-line' });
          line.appendChild(el('sup', { className: 'ae-aff-sup' }, String(idx + 1)));
          line.appendChild(document.createTextNode(' ' + getAffLabel(aff)));
          affDiv.appendChild(line);
        });
        wrap.appendChild(affDiv);
      }

      if (isCreditSort) {
        const legend = el('span', { className: 'ae-legend' });
        legend.appendChild(el('span', { className: 'ae-legend-dot ae-dot-lead' }));
        legend.appendChild(document.createTextNode('Lead '));
        legend.appendChild(el('span', { className: 'ae-legend-dot ae-dot-equal' }));
        legend.appendChild(document.createTextNode('Equal '));
        legend.appendChild(el('span', { className: 'ae-legend-dot ae-dot-supporting' }));
        legend.appendChild(document.createTextNode('Supporting'));
        wrap.appendChild(legend);
      }
    }

    return wrap;
  }

  // ──── Profiles tab ────
  function buildProfilesTab(sorted) {
    const wrap = el('div', { className: 'ae-profiles' });
    for (let ai = 0; ai < sorted.length; ai++) {
      const author = sorted[ai];
      const isDimmed = searchQuery && !matchesSearch(author, searchQuery);
      const color = getColor(author.name);
      const card = el('div', { className: 'ae-profile-card' });
      card.style.setProperty('--i', String(ai));
      if (isDimmed) card.style.opacity = '0.3';

      // Avatar
      const avatar = buildHtmlAvatar(author, 'ae-avatar');
      if (author.corresponding) {
        avatar.appendChild(el('span', { className: 'ae-avatar-badge' }, '✉'));
      }
      card.appendChild(avatar);

      // Info
      const info = el('div', { className: 'ae-profile-info' });
      const nameRow = el('div', { className: 'ae-profile-name-row' });
      nameRow.appendChild(el('span', { className: 'ae-profile-name' }, author.name));
      if (author.career_stage) {
        nameRow.appendChild(el('span', { className: 'ae-career-stage' }, author.career_stage));
      }
      if (author.orcid) {
        const orcidLink = el('a', {
          href: `https://orcid.org/${author.orcid}`,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'ae-orcid-link',
          title: 'ORCID',
        }, '🆔');
        nameRow.appendChild(orcidLink);
      }
      info.appendChild(nameRow);

      // Affiliations
      if (author.affiliations?.length) {
        const affText = author.affiliations
          .map(a => typeof a === 'string' ? a : (a.name || a))
          .join(' · ');
        info.appendChild(el('p', { className: 'ae-profile-aff' }, affText));
      }

      // Social links
      if (author.social_links?.length) {
        const links = el('div', { className: 'ae-social-links' });
        for (const link of author.social_links) {
          const icon = { orcid: '🆔', github: '🐙', 'google-scholar': '🎓', website: '🌐', twitter: '𝕏', bluesky: '🦋', linkedin: '💼', email: '✉️' }[link.platform] || '🔗';
          links.appendChild(el('a', {
            href: link.url,
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'ae-social-link',
            title: link.platform,
          }, icon));
        }
        info.appendChild(links);
      }

      card.appendChild(info);

      // Roles
      const roles = el('div', { className: 'ae-profile-roles' });
      const creditLevels = author.credit_levels || [];
      for (const cr of creditLevels) {
        roles.appendChild(el('span', {
          className: `ae-role-badge ae-role-${cr.level}`,
        }, cr.role.replace('Writing – ', 'W: ').replace('Formal ', 'F. ')));
      }
      card.appendChild(roles);

      wrap.appendChild(card);
    }
    return wrap;
  }

  // ──── CRediT Matrix tab ────
  function buildMatrixTab(sorted) {
    const wrap = el('div', { className: 'ae-matrix-wrap' });
    const table = el('table', { className: 'ae-matrix' });

    // Header row with author avatars
    const thead = el('thead');
    const headerRow = el('tr');
    headerRow.appendChild(el('th', { className: 'ae-matrix-corner' }));
    for (let ai = 0; ai < sorted.length; ai++) {
      const author = sorted[ai];
      const isDimmed = searchQuery && !matchesSearch(author, searchQuery);
      const color = getColor(author.name);
      const th = el('th', { className: 'ae-matrix-author-th' });
      if (isDimmed) th.style.opacity = '0.3';
      th.appendChild(buildHtmlAvatar(author, 'ae-matrix-avatar'));
      const matrixName = el('div', { className: 'ae-matrix-author-name' }, author.name);
      attachAuthorPopover(matrixName, author);
      th.appendChild(matrixName);
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Role rows
    const tbody = el('tbody');
    for (const role of ALL_CREDIT_ROLES) {
      const row = el('tr');
      const icon = ROLE_ICONS[role] || '🏷️';
      row.appendChild(el('td', { className: 'ae-matrix-role' },
        el('span', { className: 'ae-matrix-role-icon' }, icon),
        el('span', {}, role),
      ));

      for (let ai = 0; ai < sorted.length; ai++) {
        const author = sorted[ai];
        const level = findCreditLevel(author, role);
        const isDimmed = searchQuery && !matchesSearch(author, searchQuery);
        const td = el('td', { className: 'ae-matrix-cell' });
        if (isDimmed) td.style.opacity = '0.3';
        if (level) {
          const dot = el('div', {
            className: `ae-dot ae-dot-${level}`,
            title: `${author.name}: ${level}`,
          });
          td.appendChild(dot);
        }
        row.appendChild(td);
      }
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);

    // Legend
    const legend = el('div', { className: 'ae-matrix-legend' });
    legend.appendChild(el('span', { className: 'ae-legend-label' }, 'Legend:'));
    legend.appendChild(el('span', { className: 'ae-legend-dot ae-dot-lead' }));
    legend.appendChild(document.createTextNode(' Lead  '));
    legend.appendChild(el('span', { className: 'ae-legend-dot ae-dot-equal' }));
    legend.appendChild(document.createTextNode(' Equal  '));
    legend.appendChild(el('span', { className: 'ae-legend-dot ae-dot-supporting' }));
    legend.appendChild(document.createTextNode(' Supporting'));
    wrap.appendChild(legend);

    return wrap;
  }

  // ──── Section Map tab ────
  function buildSectionsTab(sorted) {
    const wrap = el('div', { className: 'ae-sections' });

    // Collect all sections
    const sectionMap = new Map();
    for (const author of sorted) {
      if (!author.section_contributions) continue;
      for (const sc of author.section_contributions) {
        if (!sectionMap.has(sc.section)) sectionMap.set(sc.section, []);
        sectionMap.get(sc.section).push({ author, ...sc });
      }
    }

    let sectionIdx = 0;
    for (const [sectionId, contribs] of sectionMap) {
      contribs.sort((a, b) => (LEVEL_RANK[b.effort] || 0) - (LEVEL_RANK[a.effort] || 0));

      const section = el('div', { className: 'ae-section-block' });
      section.style.setProperty('--i', String(sectionIdx++));
      section.appendChild(el('div', { className: 'ae-section-id' }, sectionLabel(sectionId)));

      const contributors = el('div', { className: 'ae-section-contributors' });
      for (const c of contribs) {
        const color = getColor(c.author.name);
        const isDimmed = searchQuery && !matchesSearch(c.author, searchQuery);
        const chip = el('div', { className: 'ae-section-chip' });
        if (isDimmed) chip.style.opacity = '0.3';
        chip.appendChild(buildHtmlAvatar(c.author, 'ae-section-avatar'));
        const info = el('div', { className: 'ae-section-chip-info' });
        const chipName = el('span', { className: 'ae-section-chip-name' }, c.author.name);
        attachAuthorPopover(chipName, c.author);
        info.appendChild(chipName);
        if (c.effort) {
          info.appendChild(el('span', { className: `ae-effort ae-effort-${c.effort}` }, c.effort));
        }
        if (c.description) {
          info.appendChild(el('p', { className: 'ae-section-chip-desc' }, c.description));
        }
        chip.appendChild(info);
        contributors.appendChild(chip);
      }
      section.appendChild(contributors);
      wrap.appendChild(section);
    }

    if (sectionMap.size === 0) {
      wrap.appendChild(el('p', { className: 'ae-empty' }, 'No section contribution data available.'));
    }

    return wrap;
  }

  // ──── Network / Chord diagram tab ────
  // Per-role colors — grouped by purpose so related roles share a hue family
  // Thinking/Planning: blues
  // Technical/Execution: greens
  // Infrastructure: teals
  // Communication: ambers/oranges/reds
  // Leadership: purples/pinks
  const ROLE_CAT = {
    'conceptualization':          { color: '#3b5bdb' },  // deep blue
    'methodology':                { color: '#4c8bf5' },  // mid blue
    'software':                   { color: '#15803d' },  // forest green
    'validation':                 { color: '#16a34a' },  // green
    'formal analysis':            { color: '#22c55e' },  // light green
    'investigation':              { color: '#4ade80' },  // pale green
    'resources':                  { color: '#0d9488' },  // teal
    'data curation':              { color: '#06b6d4' },  // cyan
    'writing – original draft':   { color: '#d97706' },  // amber
    'writing – review & editing': { color: '#ea580c' },  // orange
    'visualization':              { color: '#dc2626' },  // red
    'supervision':                { color: '#7c3aed' },  // violet
    'project administration':     { color: '#a855f7' },  // purple
    'funding acquisition':        { color: '#ec4899' },  // pink
  };
  const LEVEL_OPACITY = { lead: 1.0, equal: 0.7, supporting: 0.4 };

  function getRoleCat(roleName) {
    const key = normalizeRole(roleName);
    return ROLE_CAT[key] || { color: '#94a3b8' };
  }

  // ── Network mode toggle helper ──
  function buildNetworkModeToggle() {
    const modeBar = el('div', { className: 'ae-mode-bar' });
    const modes = [
      { key: 'collab', label: 'Network' },
      { key: 'flow', label: 'Flow' },
      { key: 'institutions', label: 'By Institution' },
      { key: 'force', label: 'By Role' },
      { key: 'sections', label: 'By Section & Figure' },
    ];
    for (const m of modes) {
      modeBar.appendChild(el('button', {
        className: `ae-mode-chip ${networkMode === m.key ? 'ae-active' : ''}`,
        onClick: () => { networkMode = m.key; rerender(); },
      }, m.label));
    }
    return modeBar;
  }

  function buildNetworkTab(sorted, highlightSet) {
    const n = sorted.length;
    // Dispatch to mode-specific builder
    if (networkMode === 'flow') return buildFlowView(sorted, highlightSet);
    if (networkMode === 'institutions') return buildInstitutionChord(sorted, highlightSet);
    if (networkMode === 'force') return buildForceGraph(sorted, highlightSet);
    if (networkMode === 'sections') return buildSectionCircles(sorted, highlightSet);
    return buildCollabLayout(sorted, highlightSet);
  }

  function buildScatterView(sorted, highlightSet, positionFn) {
    const n = sorted.length;
    const wrap = el('div', { className: 'ae-network' });
    const ns = 'http://www.w3.org/2000/svg';
    if (n === 0) {
      wrap.appendChild(el('p', { className: 'ae-empty' }, 'No author data available.'));
      return wrap;
    }
    wrap.appendChild(buildNetworkModeToggle());

    // Compute per-author roles with colors
    const authorRoles = sorted.map(a => {
      const levels = a.credit_levels || [];
      return levels.map(cl => ({
        role: cl.role, level: cl.level,
        color: getRoleCat(cl.role).color,
        opacity: LEVEL_OPACITY[cl.level] || 0.4,
      }));
    });

    // Build edges from shared CRediT roles, weighted by contribution level
    const links = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const sharedRoles = [];
        let levelWeight = 0;
        for (const role of ALL_CREDIT_ROLES) {
          const lvlI = findCreditLevel(sorted[i], role);
          const lvlJ = findCreditLevel(sorted[j], role);
          if (lvlI && lvlJ) {
            sharedRoles.push({ role, color: getRoleCat(role).color });
            levelWeight += (LEVEL_RANK[lvlI] || 1) + (LEVEL_RANK[lvlJ] || 1);
          }
        }
        if (sharedRoles.length > 0) {
          links.push({ i, j, sharedRoles, weight: levelWeight });
        }
      }
    }
    const maxWeight = Math.max(1, ...links.map(l => l.weight));

    // SVG dimensions — scale canvas with team size for readability
    const isLarge = n > 20;
    // Canvas aspect ratio ~1.5:1 to match typical landscape containers
    const W = isLarge ? Math.min(2400, 900 + n * 24) : 700;
    const H = Math.round(W / 1.5);

    // Node sizes — keep nodes legible even for large teams
    const maxRoles = Math.max(1, ...sorted.map((_, i) => authorRoles[i].length));
    const minR = isLarge ? 24 : 18;
    const maxR = isLarge ? 44 : 38;

    // Build node objects with metadata
    const nodes = sorted.map((a, i) => {
      const roles = authorRoles[i];
      const secCount = (a.section_contributions || []).length;
      const weight = roles.length + secCount;
      const radius = minR + ((weight / (maxRoles + 10)) * (maxR - minR));
      return {
        x: 0, y: 0,
        radius, roles,
        name: a.name,
        firstName: getFirstName(a.name),
        lastName: getLastName(a.name),
        careerStage: a.career_stage || '',
        roleCount: roles.length,
        secCount,
        color: getColor(a.name),
      };
    });

    // Reuse cached positions if available, otherwise compute fresh
    const layoutKey = sorted.map(a => a.name).join('|');
    if (cachedLayout && cachedLayout.key === layoutKey) {
      for (let i = 0; i < n; i++) {
        nodes[i].x = cachedLayout.positions[i].x;
        nodes[i].y = cachedLayout.positions[i].y;
      }
    } else {
      // Let the caller compute positions
      positionFn(nodes, links, n, W, H, isLarge);

      // Normalize positions to fit within the SVG with padding
      const pad = maxR + 30;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const nd of nodes) {
        minX = Math.min(minX, nd.x - nd.radius);
        minY = Math.min(minY, nd.y - nd.radius);
        maxX = Math.max(maxX, nd.x + nd.radius);
        maxY = Math.max(maxY, nd.y + nd.radius);
      }
      const dataW = (maxX - minX) || 1, dataH = (maxY - minY) || 1;
      const scaleX = (W - 2 * pad) / dataW, scaleY = (H - 2 * pad) / dataH;
      const scale = Math.min(scaleX, scaleY);
      const offsetX = pad + ((W - 2 * pad) - dataW * scale) / 2 - minX * scale;
      const offsetY = pad + ((H - 2 * pad) - dataH * scale) / 2 - minY * scale;
      for (const nd of nodes) {
        nd.x = nd.x * scale + offsetX;
        nd.y = nd.y * scale + offsetY;
      }

      // Cache positions for shared layout between Network & Flow views
      cachedLayout = { key: layoutKey, positions: nodes.map(nd => ({ x: nd.x, y: nd.y })) };
    }

    // Compute tight bounding box around actual node positions (including labels)
    const labelPad = 30; // extra space for name labels below nodes
    let tMinX = Infinity, tMinY = Infinity, tMaxX = -Infinity, tMaxY = -Infinity;
    for (const nd of nodes) {
      tMinX = Math.min(tMinX, nd.x - nd.radius - 10);
      tMinY = Math.min(tMinY, nd.y - nd.radius - 10);
      tMaxX = Math.max(tMaxX, nd.x + nd.radius + 10);
      tMaxY = Math.max(tMaxY, nd.y + nd.radius + labelPad);
    }
    const fitW = tMaxX - tMinX, fitH = tMaxY - tMinY;
    // Initial viewBox: tight fit with small margin
    const fitMargin = 20;
    const initVbX = tMinX - fitMargin;
    const initVbY = tMinY - fitMargin;
    const initVbW = fitW + 2 * fitMargin;
    const initVbH = fitH + 2 * fitMargin;

    // Hover state
    let hoveredIdx = null;
    let hoveredRole = null;

    function renderSVG() {
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('class', 'ae-network-svg');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.style.display = 'block';

      // Edges — per-role, differentiated by contribution level:
      //   lead: MST edges, thick stroke (4px)
      //   equal: MST edges, medium stroke (2px)
      //   supporting: MST edges, thin stroke (0.7px)
      const roleMSTEdges = [];
      for (const role of ALL_CREDIT_ROLES) {
        const rc = getRoleCat(role);
        // Find all author indices who have this role, with their levels
        const members = [];
        const memberLevel = new Map(); // idx -> level string
        for (let i = 0; i < n; i++) {
          const lvl = findCreditLevel(sorted[i], role);
          if (lvl) { members.push(i); memberLevel.set(i, lvl); }
        }
        if (members.length < 2) continue;

        // Prim's MST among all members (nearest-neighbor chains)
        const inTree = new Set([members[0]]);
        const remaining = new Set(members.slice(1));
        while (remaining.size > 0) {
          let bestDist = Infinity, bestA = -1, bestB = -1;
          for (const a of inTree) {
            for (const b of remaining) {
              const dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y;
              const d = dx * dx + dy * dy;
              if (d < bestDist) { bestDist = d; bestA = a; bestB = b; }
            }
          }
          inTree.add(bestB);
          remaining.delete(bestB);
          // Edge level = higher level of the two endpoints
          const lvlA = LEVEL_RANK[memberLevel.get(bestA)] || 0;
          const lvlB = LEVEL_RANK[memberLevel.get(bestB)] || 0;
          const edgeLevel = lvlA >= lvlB ? memberLevel.get(bestA) : memberLevel.get(bestB);
          roleMSTEdges.push({ i: bestA, j: bestB, role, color: rc.color, level: edgeLevel });
        }
      }

      // Build adjacency lists per role for tree traversal on hover
      const roleAdj = new Map(); // role -> Map<nodeIdx, Set<edgeIdx>>
      for (let ei = 0; ei < roleMSTEdges.length; ei++) {
        const e = roleMSTEdges[ei];
        if (!roleAdj.has(e.role)) roleAdj.set(e.role, new Map());
        const adj = roleAdj.get(e.role);
        if (!adj.has(e.i)) adj.set(e.i, []);
        if (!adj.has(e.j)) adj.set(e.j, []);
        adj.get(e.i).push(ei);
        adj.get(e.j).push(ei);
      }

      // When hovering, find all edges in MST trees for roles the hovered author has
      // OR when hovering a role in the legend, highlight that role's entire MST tree
      let highlightedEdges = null;
      const isHovering = hoveredIdx !== null || hoveredRole !== null;
      if (isHovering) {
        highlightedEdges = new Set();
        if (hoveredRole !== null) {
          // Legend hover: highlight the entire MST tree for this role
          const normalHovered = normalizeRole(hoveredRole);
          for (let ei = 0; ei < roleMSTEdges.length; ei++) {
            if (normalizeRole(roleMSTEdges[ei].role) === normalHovered) {
              highlightedEdges.add(ei);
            }
          }
        } else {
          // Node hover: BFS the MST trees for the hovered author's roles
          for (const [role, adj] of roleAdj) {
            if (!adj.has(hoveredIdx)) continue;
            const visited = new Set([hoveredIdx]);
            const queue = [hoveredIdx];
            while (queue.length > 0) {
              const cur = queue.shift();
              for (const ei of (adj.get(cur) || [])) {
                const e = roleMSTEdges[ei];
                const other = e.i === cur ? e.j : e.i;
                if (!visited.has(other)) {
                  visited.add(other);
                  queue.push(other);
                  highlightedEdges.add(ei);
                }
              }
            }
          }
        }
      }

      // Group MST edges by author pair to draw parallel strands
      const pairEdges = new Map();
      for (let ei = 0; ei < roleMSTEdges.length; ei++) {
        const e = roleMSTEdges[ei];
        const key = e.i < e.j ? `${e.i}::${e.j}` : `${e.j}::${e.i}`;
        const arr = pairEdges.get(key) || [];
        arr.push({ ...e, edgeIdx: ei });
        pairEdges.set(key, arr);
      }

      for (const [, edges] of pairEdges) {
        const { i, j } = edges[0];
        const s = nodes[i], t = nodes[j];
        // Filter to only highlighted strands when hovering
        const visibleEdges = isHovering && highlightedEdges
          ? edges.filter(e => highlightedEdges.has(e.edgeIdx))
          : edges;
        if (visibleEdges.length === 0) continue;
        const baseOpacity = !isHovering ? 0.45 : 0.75;

        const dx = t.x - s.x, dy = t.y - s.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / len, uy = dy / len;
        const nx = -uy, ny = ux;
        const gap = 9;
        const sx = s.x + ux * (s.radius + gap), sy = s.y + uy * (s.radius + gap);
        const tx = t.x - ux * (t.radius + gap), ty = t.y - uy * (t.radius + gap);

        const strandGap = 3.5;
        const bandW = visibleEdges.length * strandGap;
        let offset = -bandW / 2 + strandGap / 2;

        for (const e of visibleEdges) {
          // Stroke width by contribution level: lead=6, equal=3.5, supporting=1.5
          const strandW = e.level === 'lead' ? 6.0 : e.level === 'equal' ? 3.5 : 1.5;
          const ox = nx * offset, oy = ny * offset;
          const path = document.createElementNS(ns, 'path');
          path.setAttribute('d', `M${sx + ox},${sy + oy} L${tx + ox},${ty + oy}`);
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', e.color);
          path.setAttribute('stroke-width', String(strandW));
          path.setAttribute('stroke-opacity', String(baseOpacity));
          path.setAttribute('stroke-linecap', 'round');
          path.setAttribute('vector-effect', 'non-scaling-stroke');
          const title = document.createElementNS(ns, 'title');
          title.textContent = `${sorted[i].name} ↔ ${sorted[j].name}\n${e.role} (${e.level})`;
          path.appendChild(title);
          svg.appendChild(path);
          offset += strandGap;
        }
      }

      // Collect nodes that are part of highlighted MST trees
      const highlightedNodes = new Set();
      if (isHovering) {
        if (hoveredIdx !== null) highlightedNodes.add(hoveredIdx);
        if (hoveredRole !== null) {
          // All authors who have this role
          const normalHovered = normalizeRole(hoveredRole);
          for (let idx = 0; idx < n; idx++) {
            const levels = sorted[idx].credit_levels || [];
            if (levels.some(cl => normalizeRole(cl.role) === normalHovered)) {
              highlightedNodes.add(idx);
            }
          }
        }
        if (highlightedEdges) {
          for (const ei of highlightedEdges) {
            highlightedNodes.add(roleMSTEdges[ei].i);
            highlightedNodes.add(roleMSTEdges[ei].j);
          }
        }
      }

      // Nodes
      for (let idx = 0; idx < n; idx++) {
        const nd = nodes[idx];
        const isHovered = hoveredIdx === idx;
        const isConnected = isHovering && highlightedNodes.has(idx);
        const isDim = isHovering && !isHovered && !isConnected;
        const isSearchDim = highlightSet && !highlightSet.has(idx);
        const groupOpacity = isDim ? 0.15 : isSearchDim ? 0.25 : 1;

        const g = document.createElementNS(ns, 'g');
        g.style.cursor = 'pointer';
        g.style.opacity = String(groupOpacity);
        g.style.transition = 'opacity 0.2s';

        // Role ring arcs
        const ringR = nd.radius + 5;
        const roles = nd.roles;
        const arcGap = 0.06;
        const totalAngle = 2 * Math.PI - roles.length * arcGap;
        const segAngle = roles.length > 0 ? totalAngle / roles.length : 0;
        for (let ri = 0; ri < roles.length; ri++) {
          const startA = -Math.PI / 2 + ri * (segAngle + arcGap);
          const endA = startA + segAngle;
          const arcS = { x: nd.x + ringR * Math.cos(startA), y: nd.y + ringR * Math.sin(startA) };
          const arcE = { x: nd.x + ringR * Math.cos(endA), y: nd.y + ringR * Math.sin(endA) };
          const largeArc = (endA - startA) > Math.PI ? 1 : 0;
          const arc = document.createElementNS(ns, 'path');
          arc.setAttribute('d', `M ${arcS.x} ${arcS.y} A ${ringR} ${ringR} 0 ${largeArc} 1 ${arcE.x} ${arcE.y}`);
          arc.setAttribute('stroke', roles[ri].color);
          arc.setAttribute('stroke-width', '4'); arc.setAttribute('stroke-linecap', 'round');
          arc.setAttribute('fill', 'none'); arc.setAttribute('opacity', String(roles[ri].opacity));
          arc.setAttribute('vector-effect', 'non-scaling-stroke');
          g.appendChild(arc);
        }

        // Shadow + main circle
        const shadow = document.createElementNS(ns, 'circle');
        shadow.setAttribute('cx', String(nd.x)); shadow.setAttribute('cy', String(nd.y + 2));
        shadow.setAttribute('r', String(nd.radius));
        shadow.setAttribute('fill', 'black'); shadow.setAttribute('opacity', '0.08');
        g.appendChild(shadow);

        const circle = document.createElementNS(ns, 'circle');
        circle.setAttribute('cx', String(nd.x)); circle.setAttribute('cy', String(nd.y));
        circle.setAttribute('r', String(nd.radius));
        circle.setAttribute('fill', nd.color);
        circle.setAttribute('stroke', isDark ? '#374151' : 'white'); circle.setAttribute('stroke-width', '3');
        circle.setAttribute('vector-effect', 'non-scaling-stroke');
        g.appendChild(circle);

        if (isHovered) {
          const hRing = document.createElementNS(ns, 'circle');
          hRing.setAttribute('cx', String(nd.x)); hRing.setAttribute('cy', String(nd.y));
          hRing.setAttribute('r', String(nd.radius + 2));
          hRing.setAttribute('fill', 'none');
          hRing.setAttribute('stroke', nd.color); hRing.setAttribute('stroke-width', '2');
          hRing.setAttribute('opacity', '0.4');
          hRing.setAttribute('vector-effect', 'non-scaling-stroke');
          g.appendChild(hRing);
        }

        appendSvgAvatar(svg, g, ns, nd.x, nd.y, nd.radius, sorted[idx], nd.radius * 0.55);

        const isSearchMatch = highlightSet && highlightSet.has(idx);
        const label = document.createElementNS(ns, 'text');
        label.setAttribute('x', String(nd.x));
        label.setAttribute('y', String(nd.y + nd.radius + (isLarge ? 16 : 18)));
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('fill', isHovered ? (isDark ? '#e2e8f0' : '#1e3a5f') : isSearchMatch ? (isDark ? '#a5b4fc' : '#4338ca') : (isDark ? '#e2e8f0' : '#1f2937'));
        label.setAttribute('font-size', isLarge ? '19' : '15');
        label.setAttribute('font-weight', isHovered || isSearchMatch ? '700' : '500');
        label.setAttribute('font-family', 'Inter, system-ui, sans-serif');
        label.style.pointerEvents = 'none';
        label.textContent = nd.lastName;
        g.appendChild(label);

        g.addEventListener('mouseenter', () => { hoveredIdx = idx; rerenderView(); });
        g.addEventListener('mouseleave', () => { hoveredIdx = null; rerenderView(); });
        g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
        g.setAttribute('aria-label', nd.name);
        g.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); hoveredIdx = hoveredIdx === idx ? null : idx; rerenderView();
          }
        });
        g.addEventListener('focus', () => { hoveredIdx = idx; rerenderView(); });
        g.addEventListener('blur', () => { hoveredIdx = null; rerenderView(); });

        svg.appendChild(g);
      }

      return svg;
    }

    // Info card
    function renderInfoCard() {
      if (hoveredIdx === null) return null;
      const nd = nodes[hoveredIdx];
      const authorEdges = links.filter(l => l.i === hoveredIdx || l.j === hoveredIdx);
      const totalShared = authorEdges.reduce((s, l) => s + l.sharedRoles.length, 0);
      const card = el('div', { className: 'ae-info-card' });
      const avatarRow = el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } });
      avatarRow.appendChild(buildHtmlAvatar(sorted[hoveredIdx], 'ae-info-avatar', { width: '40px', height: '40px', borderRadius: '50%', flexShrink: '0' }));
      const nameBlock = el('div', {},
        el('p', { className: 'ae-info-name' }, nd.name),
        el('p', { className: 'ae-info-stage' }, nd.careerStage),
      );
      avatarRow.appendChild(nameBlock);
      card.appendChild(avatarRow);
      card.appendChild(el('div', { className: 'ae-info-stats' },
          el('p', {}, el('strong', {}, String(nd.roleCount)), ' CRediT roles'),
          el('p', {}, el('strong', {}, String(nd.secCount)), ' sections'),
          el('p', {}, el('strong', {}, String(totalShared)), ' shared role links'),
        ),
      );
      const badges = el('div', { className: 'ae-info-badges' });
      for (const r of nd.roles) {
        badges.appendChild(el('span', {
          className: 'ae-info-badge',
          style: { backgroundColor: r.color, opacity: r.opacity },
        }, r.role.replace('Writing – ', '').replace('Formal ', '').slice(0, 14)));
      }
      card.appendChild(badges);
      return card;
    }

    // Container — outer wrapper allows info card to overflow into margin
    const graphOuter = el('div', { className: 'ae-graph-outer' });
    const graphWrap = el('div', { className: 'ae-network-graph' });

    // Zoom/pan — start with tight-fit viewBox
    let vbX = initVbX, vbY = initVbY, vbW = initVbW, vbH = initVbH;
    let isPanning = false, panStartX = 0, panStartY = 0, panStartVbX = 0, panStartVbY = 0;
    function applyViewBox() {
      const svg = graphWrap.querySelector('.ae-network-svg');
      if (svg) svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
    }
    graphWrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const newW = Math.max(initVbW * 0.2, Math.min(initVbW * 3, vbW * factor));
      const newH = Math.max(initVbH * 0.2, Math.min(initVbH * 3, vbH * factor));
      const rect = graphWrap.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;
      vbX += (vbW - newW) * mx; vbY += (vbH - newH) * my;
      vbW = newW; vbH = newH; applyViewBox();
    }, { passive: false });
    graphWrap.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isPanning = true; panStartX = e.clientX; panStartY = e.clientY;
      panStartVbX = vbX; panStartVbY = vbY; graphWrap.style.cursor = 'grabbing';
    });
    graphWrap.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      const rect = graphWrap.getBoundingClientRect();
      vbX = panStartVbX - (e.clientX - panStartX) * (vbW / rect.width);
      vbY = panStartVbY - (e.clientY - panStartY) * (vbH / rect.height);
      applyViewBox();
    });
    const stopPan = () => { isPanning = false; graphWrap.style.cursor = 'grab'; };
    graphWrap.addEventListener('mouseup', stopPan);
    graphWrap.addEventListener('mouseleave', stopPan);

    // Zoom controls
    const zoomControls = el('div', { className: 'ae-zoom-controls' });
    zoomControls.appendChild(el('button', { className: 'ae-zoom-btn',
      onClick: () => { const nW = Math.max(initVbW*0.2,vbW*0.7), nH = Math.max(initVbH*0.2,vbH*0.7); vbX+=(vbW-nW)/2; vbY+=(vbH-nH)/2; vbW=nW; vbH=nH; applyViewBox(); }, title: 'Zoom in' }, '+'));
    zoomControls.appendChild(el('button', { className: 'ae-zoom-btn',
      onClick: () => { const nW = Math.min(initVbW*3,vbW*1.4), nH = Math.min(initVbH*3,vbH*1.4); vbX+=(vbW-nW)/2; vbY+=(vbH-nH)/2; vbW=nW; vbH=nH; applyViewBox(); }, title: 'Zoom out' }, '−'));
    zoomControls.appendChild(el('button', { className: 'ae-zoom-btn',
      onClick: () => { vbX=initVbX; vbY=initVbY; vbW=initVbW; vbH=initVbH; applyViewBox(); }, title: 'Reset zoom' }, '⟲'));
    graphWrap.appendChild(zoomControls);

    function rerenderView() {
      const oldSvg = graphWrap.querySelector('.ae-network-svg');
      const newSvg = renderSVG();
      newSvg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
      if (oldSvg) oldSvg.replaceWith(newSvg); else graphWrap.appendChild(newSvg);
      // Info card floats in right margin using fixed positioning
      const oldCard = graphOuter.querySelector('.ae-info-card');
      const newCard = renderInfoCard();
      if (newCard) {
        const rect = graphWrap.getBoundingClientRect();
        newCard.style.top = rect.top + 12 + 'px';
        newCard.style.left = rect.right + 12 + 'px';
      }
      if (oldCard) { if (newCard) oldCard.replaceWith(newCard); else oldCard.remove(); }
      else if (newCard) graphOuter.appendChild(newCard);
    }

    rerenderView();
    graphOuter.appendChild(graphWrap);
    wrap.appendChild(graphOuter);

    // Legend
    const legend = el('div', { className: 'ae-network-legend ae-role-legend' });
    for (const role of ALL_CREDIT_ROLES) {
      const rc = getRoleCat(role);
      const item = el('div', { className: 'ae-legend-item', style: { cursor: 'pointer' } },
        el('span', { className: 'ae-legend-dot', style: { backgroundColor: rc.color } }),
        el('span', { className: 'ae-legend-label' }, role.replace('Writing – ', 'W: ').replace('Formal a', 'A')),
      );
      item.addEventListener('mouseenter', () => { hoveredRole = role; rerenderView(); });
      item.addEventListener('mouseleave', () => { hoveredRole = null; rerenderView(); });
      legend.appendChild(item);
    }
    wrap.appendChild(legend);

    // Stats
    const stats = el('div', { className: 'ae-network-stats' });
    const totalRoles = sorted.reduce((s, a) => s + (a.credit_levels?.length || 0), 0);
    stats.appendChild(el('div', { className: 'ae-stat' },
      el('span', { className: 'ae-stat-value' }, String(n)),
      el('span', { className: 'ae-stat-label' }, 'Authors')));
    stats.appendChild(el('div', { className: 'ae-stat' },
      el('span', { className: 'ae-stat-value' }, (totalRoles / n).toFixed(1)),
      el('span', { className: 'ae-stat-label' }, 'Avg roles')));
    stats.appendChild(el('div', { className: 'ae-stat' },
      el('span', { className: 'ae-stat-value' }, String(links.length)),
      el('span', { className: 'ae-stat-label' }, 'Connections')));
    wrap.appendChild(stats);

    return wrap;
  }

  // ──── Flow view — animated particles along per-role MST edges ────
  function buildFlowView(sorted, highlightSet) {
    const n = sorted.length;
    const wrap = el('div', { className: 'ae-network' });
    const ns = 'http://www.w3.org/2000/svg';
    if (n === 0) {
      wrap.appendChild(el('p', { className: 'ae-empty' }, 'No author data available.'));
      return wrap;
    }
    wrap.appendChild(buildNetworkModeToggle());

    // Compute per-author roles with colors
    const authorRoles = sorted.map(a => {
      const levels = a.credit_levels || [];
      return levels.map(cl => ({
        role: cl.role, level: cl.level,
        color: getRoleCat(cl.role).color,
        opacity: LEVEL_OPACITY[cl.level] || 0.4,
      }));
    });

    // Build edges from shared CRediT roles
    const links = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const sharedRoles = [];
        let levelWeight = 0;
        for (const role of ALL_CREDIT_ROLES) {
          const lvlI = findCreditLevel(sorted[i], role);
          const lvlJ = findCreditLevel(sorted[j], role);
          if (lvlI && lvlJ) {
            sharedRoles.push({ role, color: getRoleCat(role).color });
            levelWeight += (LEVEL_RANK[lvlI] || 1) + (LEVEL_RANK[lvlJ] || 1);
          }
        }
        if (sharedRoles.length > 0) {
          links.push({ i, j, sharedRoles, weight: levelWeight });
        }
      }
    }

    // SVG dimensions
    const isLarge = n > 20;
    const W = isLarge ? Math.min(2400, 900 + n * 24) : 700;
    const H = Math.round(W / 1.5);

    // Node sizes
    const maxRoles = Math.max(1, ...sorted.map((_, i) => authorRoles[i].length));
    const minR = isLarge ? 24 : 18;
    const maxR = isLarge ? 44 : 38;

    // Build nodes
    const nodes = sorted.map((a, i) => {
      const roles = authorRoles[i];
      const weight = roles.length;
      const radius = minR + ((weight / (maxRoles + 10)) * (maxR - minR));
      return {
        x: 0, y: 0, radius, roles,
        name: a.name,
        lastName: getLastName(a.name),
        color: getColor(a.name),
        roleCount: roles.length,
      };
    });

    // Reuse cached positions from Network view, or compute fresh
    const layoutKey = sorted.map(a => a.name).join('|');
    if (cachedLayout && cachedLayout.key === layoutKey) {
      for (let i = 0; i < n; i++) {
        nodes[i].x = cachedLayout.positions[i].x;
        nodes[i].y = cachedLayout.positions[i].y;
      }
    } else {
      // Force-directed layout (same as collab)
      const CX = W / 2, CY = H / 2;
      for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n;
        nodes[i].x = CX + (W * 0.25) * Math.cos(angle);
        nodes[i].y = CY + (H * 0.25) * Math.sin(angle);
        nodes[i].vx = 0; nodes[i].vy = 0;
      }
      const ITERS = 300;
      const repulsion = isLarge ? 8000 : 15000;
      const attraction = 0.005;
      const damping = 0.92;
      const centerPull = 0.003;
      const wMax = Math.max(1, ...links.map(l => l.weight));
      for (let iter = 0; iter < ITERS; iter++) {
        const alpha = 1 - iter / ITERS;
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            let dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const minDist = nodes[i].radius + nodes[j].radius + 8;
            if (dist < minDist) dist = minDist;
            const force = (repulsion * alpha) / (dist * dist);
            nodes[i].vx += (dx / dist) * force; nodes[i].vy += (dy / dist) * force;
            nodes[j].vx -= (dx / dist) * force; nodes[j].vy -= (dy / dist) * force;
          }
        }
        for (const link of links) {
          const a = nodes[link.i], b = nodes[link.j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const w = link.weight / wMax;
          const force = attraction * w * alpha * Math.log(1 + dist);
          a.vx += (dx / dist) * force; a.vy += (dy / dist) * force;
          b.vx -= (dx / dist) * force; b.vy -= (dy / dist) * force;
        }
        for (let i = 0; i < n; i++) {
          nodes[i].vx += (CX - nodes[i].x) * centerPull * alpha;
          nodes[i].vy += (CY - nodes[i].y) * centerPull * alpha;
          nodes[i].vx *= damping; nodes[i].vy *= damping;
          nodes[i].x += nodes[i].vx; nodes[i].y += nodes[i].vy;
        }
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
            const md = nodes[i].radius + nodes[j].radius + 12;
            if (dist < md) {
              const overlap = (md - dist) / 2;
              const ux = dx / dist, uy = dy / dist;
              nodes[i].x -= ux * overlap; nodes[i].y -= uy * overlap;
              nodes[j].x += ux * overlap; nodes[j].y += uy * overlap;
            }
          }
        }
      }
      } // end for-iter

      // Normalize positions
      const pad = maxR + 30;
      let bMinX = Infinity, bMinY = Infinity, bMaxX = -Infinity, bMaxY = -Infinity;
      for (const nd of nodes) {
        bMinX = Math.min(bMinX, nd.x - nd.radius);
        bMinY = Math.min(bMinY, nd.y - nd.radius);
        bMaxX = Math.max(bMaxX, nd.x + nd.radius);
        bMaxY = Math.max(bMaxY, nd.y + nd.radius);
      }
      const dataW = (bMaxX - bMinX) || 1, dataH = (bMaxY - bMinY) || 1;
      const scaleX = (W - 2 * pad) / dataW, scaleY = (H - 2 * pad) / dataH;
      const scale = Math.min(scaleX, scaleY);
      const offsetX = pad + ((W - 2 * pad) - dataW * scale) / 2 - bMinX * scale;
      const offsetY = pad + ((H - 2 * pad) - dataH * scale) / 2 - bMinY * scale;
      for (const nd of nodes) {
        nd.x = nd.x * scale + offsetX;
        nd.y = nd.y * scale + offsetY;
      }
      // Save to cache
      cachedLayout = { key: layoutKey, positions: nodes.map(nd => ({ x: nd.x, y: nd.y })) };
    } // end else (fresh layout)

    // Per-role MST edges with direction (from higher-level to lower-level contributor)
    const flowEdges = []; // { fromIdx, toIdx, role, color, fromLevel, toLevel }
    for (const role of ALL_CREDIT_ROLES) {
      const rc = getRoleCat(role);
      const members = [];
      const memberLevel = new Map();
      for (let i = 0; i < n; i++) {
        const lvl = findCreditLevel(sorted[i], role);
        if (lvl) { members.push(i); memberLevel.set(i, lvl); }
      }
      if (members.length < 2) continue;

      // Prim's MST
      const inTree = new Set([members[0]]);
      const remaining = new Set(members.slice(1));
      while (remaining.size > 0) {
        let bestDist = Infinity, bestA = -1, bestB = -1;
        for (const a of inTree) {
          for (const b of remaining) {
            const dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y;
            const d = dx * dx + dy * dy;
            if (d < bestDist) { bestDist = d; bestA = a; bestB = b; }
          }
        }
        inTree.add(bestB);
        remaining.delete(bestB);
        const lvlA = LEVEL_RANK[memberLevel.get(bestA)] || 0;
        const lvlB = LEVEL_RANK[memberLevel.get(bestB)] || 0;
        // Flow direction: lower level → higher level (supporting→equal→lead)
        const fromIdx = lvlA <= lvlB ? bestA : bestB;
        const toIdx = lvlA <= lvlB ? bestB : bestA;
        flowEdges.push({
          fromIdx, toIdx, role, color: rc.color,
          fromLevel: memberLevel.get(fromIdx),
          toLevel: memberLevel.get(toIdx),
        });
      }
    }

    // Compute tight-fit viewBox
    const labelPad = isLarge ? 30 : 25;
    let vbMinX = Infinity, vbMinY = Infinity, vbMaxX = -Infinity, vbMaxY = -Infinity;
    for (const nd of nodes) {
      vbMinX = Math.min(vbMinX, nd.x - nd.radius - 10);
      vbMinY = Math.min(vbMinY, nd.y - nd.radius - 10);
      vbMaxX = Math.max(vbMaxX, nd.x + nd.radius + 10);
      vbMaxY = Math.max(vbMaxY, nd.y + nd.radius + labelPad + 10);
    }
    const initVbX = vbMinX, initVbY = vbMinY;
    const initVbW = (vbMaxX - vbMinX) || W;
    const initVbH = (vbMaxY - vbMinY) || H;

    // Build adjacency lists per role for tree traversal on hover
    const roleAdj = new Map(); // role -> Map<nodeIdx, [edgeIdx]>
    for (let ei = 0; ei < flowEdges.length; ei++) {
      const e = flowEdges[ei];
      if (!roleAdj.has(e.role)) roleAdj.set(e.role, new Map());
      const adj = roleAdj.get(e.role);
      if (!adj.has(e.fromIdx)) adj.set(e.fromIdx, []);
      if (!adj.has(e.toIdx)) adj.set(e.toIdx, []);
      adj.get(e.fromIdx).push(ei);
      adj.get(e.toIdx).push(ei);
    }

    // Hover state
    let flowHoveredIdx = null;
    let flowHoveredRole = null;

    // SVG
    const isDark = document.documentElement.dataset.theme === 'dark';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'ae-network-svg');
    svg.setAttribute('viewBox', `${initVbX} ${initVbY} ${initVbW} ${initVbH}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // Draw faint static edge paths
    const gap = 9;
    const edgePathEls = []; // { el, edgeIdx, role, fromIdx, toIdx }
    const edgePathData = []; // store path coords for particle animation
    // Group by pair
    const pairEdges = new Map();
    for (let ei = 0; ei < flowEdges.length; ei++) {
      const e = flowEdges[ei];
      const key = Math.min(e.fromIdx, e.toIdx) + '::' + Math.max(e.fromIdx, e.toIdx);
      const arr = pairEdges.get(key) || [];
      arr.push({ ...e, edgeIdx: ei });
      pairEdges.set(key, arr);
    }

    for (const [, edges] of pairEdges) {
      const s = nodes[edges[0].fromIdx], t = nodes[edges[0].toIdx];
      const dx = t.x - s.x, dy = t.y - s.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / len, uy = dy / len;
      const nx = -uy, ny = ux;
      const sx = s.x + ux * (s.radius + gap), sy = s.y + uy * (s.radius + gap);
      const tx = t.x - ux * (t.radius + gap), ty = t.y - uy * (t.radius + gap);

      const strandGap = 3.5;
      const bandW = edges.length * strandGap;
      let offset = -bandW / 2 + strandGap / 2;

      for (const e of edges) {
        const ox = nx * offset, oy = ny * offset;
        const x1 = sx + ox, y1 = sy + oy;
        const x2 = tx + ox, y2 = ty + oy;
        // Ensure from→to direction for particles
        const fNode = nodes[e.fromIdx], tNode = nodes[e.toIdx];
        const fdx = fNode.x - x1, fdy = fNode.y - y1;
        const tdx = tNode.x - x1, tdy = tNode.y - y1;
        const fDistSq = fdx * fdx + fdy * fdy;
        const tDistSq = tdx * tdx + tdy * tdy;
        const px1 = fDistSq <= tDistSq ? x1 : x2;
        const py1 = fDistSq <= tDistSq ? y1 : y2;
        const px2 = fDistSq <= tDistSq ? x2 : x1;
        const py2 = fDistSq <= tDistSq ? y2 : y1;

        // Static path — level-based thickness
        const strandW = e.fromLevel === 'lead' ? 4 : e.fromLevel === 'equal' ? 2.5 : 1.2;
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', `M${px1},${py1} L${px2},${py2}`);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', e.color);
        path.setAttribute('stroke-width', String(strandW));
        path.setAttribute('stroke-opacity', '0.25');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('vector-effect', 'non-scaling-stroke');
        svg.appendChild(path);

        // Store for hover + particle animation
        const epData = {
          x1: px1, y1: py1, x2: px2, y2: py2,
          color: e.color, role: e.role,
          fromLevel: e.fromLevel, toLevel: e.toLevel,
          edgeIdx: e.edgeIdx,
          fromIdx: e.fromIdx, toIdx: e.toIdx,
        };
        edgePathEls.push({ el: path, ...epData });
        edgePathData.push(epData);
        offset += strandGap;
      }
    }

    // Draw nodes
    const nodeGroups = []; // store node <g> elements for hover updates
    for (let idx = 0; idx < n; idx++) {
      const nd = nodes[idx];
      const isSearchDim = highlightSet && !highlightSet.has(idx);
      const g = document.createElementNS(ns, 'g');
      g.style.cursor = 'pointer';
      g.style.transition = 'opacity 0.2s';
      if (isSearchDim) g.style.opacity = '0.25';
      nodeGroups.push(g);

      // Role ring arcs
      const ringR = nd.radius + 5;
      const roles = nd.roles;
      const arcGap = 0.06;
      const totalAngle = 2 * Math.PI - roles.length * arcGap;
      const segAngle = roles.length > 0 ? totalAngle / roles.length : 0;
      for (let ri = 0; ri < roles.length; ri++) {
        const startA = -Math.PI / 2 + ri * (segAngle + arcGap);
        const endA = startA + segAngle;
        const arcS = { x: nd.x + ringR * Math.cos(startA), y: nd.y + ringR * Math.sin(startA) };
        const arcE = { x: nd.x + ringR * Math.cos(endA), y: nd.y + ringR * Math.sin(endA) };
        const largeArc = (endA - startA) > Math.PI ? 1 : 0;
        const arc = document.createElementNS(ns, 'path');
        arc.setAttribute('d', `M ${arcS.x} ${arcS.y} A ${ringR} ${ringR} 0 ${largeArc} 1 ${arcE.x} ${arcE.y}`);
        arc.setAttribute('stroke', roles[ri].color);
        arc.setAttribute('stroke-width', '4'); arc.setAttribute('stroke-linecap', 'round');
        arc.setAttribute('fill', 'none'); arc.setAttribute('opacity', String(roles[ri].opacity));
        arc.setAttribute('vector-effect', 'non-scaling-stroke');
        g.appendChild(arc);
      }

      // Circle
      const shadow = document.createElementNS(ns, 'circle');
      shadow.setAttribute('cx', String(nd.x)); shadow.setAttribute('cy', String(nd.y + 2));
      shadow.setAttribute('r', String(nd.radius));
      shadow.setAttribute('fill', 'black'); shadow.setAttribute('opacity', '0.08');
      g.appendChild(shadow);

      const circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', String(nd.x)); circle.setAttribute('cy', String(nd.y));
      circle.setAttribute('r', String(nd.radius));
      circle.setAttribute('fill', nd.color);
      circle.setAttribute('stroke', isDark ? '#374151' : 'white'); circle.setAttribute('stroke-width', '3');
      circle.setAttribute('vector-effect', 'non-scaling-stroke');
      g.appendChild(circle);

      appendSvgAvatar(svg, g, ns, nd.x, nd.y, nd.radius, sorted[idx], nd.radius * 0.55);

      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', String(nd.x));
      label.setAttribute('y', String(nd.y + nd.radius + (isLarge ? 16 : 18)));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', isDark ? '#e2e8f0' : '#1f2937');
      label.setAttribute('font-size', isLarge ? '19' : '15');
      label.setAttribute('font-weight', '500');
      label.setAttribute('font-family', 'Inter, system-ui, sans-serif');
      label.style.pointerEvents = 'none';
      label.textContent = nd.lastName;
      g.appendChild(label);

      g.addEventListener('mouseenter', () => { flowHoveredIdx = idx; updateFlowHover(); });
      g.addEventListener('mouseleave', () => { flowHoveredIdx = null; updateFlowHover(); });

      svg.appendChild(g);
    }

    // Animated particles — constant density and speed across all edges
    const PARTICLE_SPACING = 60; // SVG units between particles
    const FLOW_SPEED = 80; // SVG units per second (same for all)
    const particleEls = [];
    for (const ep of edgePathData) {
      const edgeLen = Math.sqrt((ep.x2 - ep.x1) ** 2 + (ep.y2 - ep.y1) ** 2) || 1;
      const count = Math.max(1, Math.round(edgeLen / PARTICLE_SPACING));
      const speed = FLOW_SPEED / edgeLen; // normalized 0→1 per second
      for (let p = 0; p < count; p++) {
        const dot = document.createElementNS(ns, 'circle');
        const r = ep.fromLevel === 'lead' ? 5 : ep.fromLevel === 'equal' ? 3.5 : 2.5;
        const t0 = p / count;
        dot.setAttribute('cx', String(ep.x1 + (ep.x2 - ep.x1) * t0));
        dot.setAttribute('cy', String(ep.y1 + (ep.y2 - ep.y1) * t0));
        dot.setAttribute('r', String(r));
        dot.setAttribute('fill', ep.color);
        dot.setAttribute('opacity', '0.85');
        svg.appendChild(dot);
        particleEls.push({
          el: dot,
          x1: ep.x1, y1: ep.y1, x2: ep.x2, y2: ep.y2,
          t: t0, speed,
          edgeIdx: ep.edgeIdx, role: ep.role,
        });
      }
    }

    // Hover update — dynamically set opacity on edges, particles, and nodes
    function updateFlowHover() {
      const isHovering = flowHoveredIdx !== null || flowHoveredRole !== null;
      let highlightedEdges = null;
      let highlightedNodes = null;

      if (isHovering) {
        highlightedEdges = new Set();
        highlightedNodes = new Set();

        if (flowHoveredRole !== null) {
          // Legend hover: highlight entire MST tree for this role
          const normalHovered = normalizeRole(flowHoveredRole);
          for (let ei = 0; ei < flowEdges.length; ei++) {
            if (normalizeRole(flowEdges[ei].role) === normalHovered) {
              highlightedEdges.add(ei);
              highlightedNodes.add(flowEdges[ei].fromIdx);
              highlightedNodes.add(flowEdges[ei].toIdx);
            }
          }
        } else {
          // Node hover: BFS the MST trees for this author's roles
          highlightedNodes.add(flowHoveredIdx);
          for (const [role, adj] of roleAdj) {
            if (!adj.has(flowHoveredIdx)) continue;
            const visited = new Set([flowHoveredIdx]);
            const queue = [flowHoveredIdx];
            while (queue.length > 0) {
              const cur = queue.shift();
              for (const ei of (adj.get(cur) || [])) {
                const e = flowEdges[ei];
                const other = e.fromIdx === cur ? e.toIdx : e.fromIdx;
                if (!visited.has(other)) {
                  visited.add(other);
                  queue.push(other);
                  highlightedEdges.add(ei);
                  highlightedNodes.add(other);
                }
              }
            }
          }
        }
      }

      // Update edge paths
      for (const ep of edgePathEls) {
        if (!isHovering) {
          ep.el.setAttribute('stroke-opacity', '0.25');
        } else if (highlightedEdges.has(ep.edgeIdx)) {
          ep.el.setAttribute('stroke-opacity', '0.6');
        } else {
          ep.el.setAttribute('stroke-opacity', '0.05');
        }
      }

      // Update particles — store highlight state for animation loop
      for (const p of particleEls) {
        if (!isHovering) {
          p.highlighted = true; p.dimmed = false;
        } else if (highlightedEdges.has(p.edgeIdx)) {
          p.highlighted = true; p.dimmed = false;
        } else {
          p.highlighted = false; p.dimmed = true;
        }
      }

      // Update nodes
      for (let idx = 0; idx < n; idx++) {
        const isSearchDim = highlightSet && !highlightSet.has(idx);
        if (!isHovering) {
          nodeGroups[idx].style.opacity = isSearchDim ? '0.25' : '1';
        } else if (highlightedNodes.has(idx)) {
          nodeGroups[idx].style.opacity = '1';
        } else {
          nodeGroups[idx].style.opacity = '0.15';
        }
      }

      // Update info card
      const oldCard = graphOuter.querySelector('.ae-info-card');
      if (flowHoveredIdx !== null) {
        const nd = nodes[flowHoveredIdx];
        const a = sorted[flowHoveredIdx];
        const authorEdges = flowEdges.filter(e => e.fromIdx === flowHoveredIdx || e.toIdx === flowHoveredIdx);
        const card = el('div', { className: 'ae-info-card' });
        const avatarRow = el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } });
        avatarRow.appendChild(buildHtmlAvatar(a, 'ae-info-avatar', { width: '40px', height: '40px', borderRadius: '50%', flexShrink: '0' }));
        avatarRow.appendChild(el('div', {},
          el('p', { className: 'ae-info-name' }, nd.name),
          el('p', { className: 'ae-info-stage' }, a.career_stage || ''),
        ));
        card.appendChild(avatarRow);
        card.appendChild(el('div', { className: 'ae-info-stats' },
          el('p', {}, el('strong', {}, String(nd.roleCount)), ' CRediT roles'),
          el('p', {}, el('strong', {}, String(authorEdges.length)), ' flow connections'),
        ));
        const badges = el('div', { className: 'ae-info-badges' });
        for (const r of nd.roles) {
          badges.appendChild(el('span', {
            className: 'ae-info-badge',
            style: { backgroundColor: r.color, opacity: r.opacity },
          }, r.role.replace('Writing – ', '').replace('Formal ', '').slice(0, 14)));
        }
        card.appendChild(badges);
        // Position card
        const rect = graphWrap.getBoundingClientRect();
        card.style.top = rect.top + 12 + 'px';
        card.style.left = rect.right + 12 + 'px';
        if (oldCard) oldCard.replaceWith(card); else graphOuter.appendChild(card);
      } else if (oldCard) {
        oldCard.remove();
      }
    }

    // Animation loop
    let animId = null;
    let lastTime = null;
    function animateParticles(timestamp) {
      if (!lastTime) lastTime = timestamp;
      const dt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      for (const p of particleEls) {
        p.t += p.speed * dt;
        if (p.t > 1) p.t -= Math.floor(p.t);
        const x = p.x1 + (p.x2 - p.x1) * p.t;
        const y = p.y1 + (p.y2 - p.y1) * p.t;
        p.el.setAttribute('cx', String(x));
        p.el.setAttribute('cy', String(y));
        const fade = Math.min(p.t * 4, (1 - p.t) * 4, 1);
        const baseOpacity = p.dimmed ? 0.08 : 0.85;
        p.el.setAttribute('opacity', String(baseOpacity * fade));
      }
      animId = requestAnimationFrame(animateParticles);
    }

    // Container with zoom/pan
    const graphOuter = el('div', { className: 'ae-graph-outer' });
    const graphWrap = el('div', { className: 'ae-network-graph' });

    let vbX = initVbX, vbY = initVbY, vbW = initVbW, vbH = initVbH;
    let isPanning = false, panStartX = 0, panStartY = 0, panStartVbX = 0, panStartVbY = 0;
    function applyViewBox() {
      svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
    }
    graphWrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const newW = Math.max(initVbW * 0.2, Math.min(initVbW * 3, vbW * factor));
      const newH = Math.max(initVbH * 0.2, Math.min(initVbH * 3, vbH * factor));
      const rect = graphWrap.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;
      vbX += (vbW - newW) * mx; vbY += (vbH - newH) * my;
      vbW = newW; vbH = newH;
      applyViewBox();
    }, { passive: false });
    graphWrap.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isPanning = true; panStartX = e.clientX; panStartY = e.clientY;
      panStartVbX = vbX; panStartVbY = vbY;
      graphWrap.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      const rect = graphWrap.getBoundingClientRect();
      const dx = (e.clientX - panStartX) / rect.width * vbW;
      const dy = (e.clientY - panStartY) / rect.height * vbH;
      vbX = panStartVbX - dx; vbY = panStartVbY - dy;
      applyViewBox();
    });
    window.addEventListener('mouseup', () => {
      if (isPanning) { isPanning = false; graphWrap.style.cursor = 'grab'; }
    });

    // Zoom reset button
    const resetBtn = el('button', {
      className: 'ae-zoom-reset',
      onClick: () => { vbX = initVbX; vbY = initVbY; vbW = initVbW; vbH = initVbH; applyViewBox(); },
      title: 'Reset zoom',
    }, '⟳');

    graphWrap.appendChild(svg);
    graphOuter.appendChild(graphWrap);
    graphOuter.appendChild(resetBtn);
    wrap.appendChild(graphOuter);

    // Start animation immediately
    animId = requestAnimationFrame(animateParticles);

    // Legend
    const legend = el('div', { className: 'ae-network-legend ae-role-legend' });
    for (const role of ALL_CREDIT_ROLES) {
      const rc = getRoleCat(role);
      const item = el('div', { className: 'ae-legend-item', style: { cursor: 'pointer' } },
        el('span', { className: 'ae-legend-dot', style: { backgroundColor: rc.color } }),
        el('span', { className: 'ae-legend-label' }, role.replace('Writing – ', 'W: ').replace('Formal a', 'A')),
      );
      item.addEventListener('mouseenter', () => { flowHoveredRole = role; updateFlowHover(); });
      item.addEventListener('mouseleave', () => { flowHoveredRole = null; updateFlowHover(); });
      legend.appendChild(item);
    }
    wrap.appendChild(legend);

    // Level key
    const levelKey = el('div', { className: 'ae-network-legend' });
    for (const [lvl, size] of [['Lead', 5], ['Equal', 3.5], ['Supporting', 2.5]]) {
      const dotStyle = {
        width: size * 2 + 'px', height: size * 2 + 'px',
        borderRadius: '50%', backgroundColor: '#6366f1', flexShrink: '0',
      };
      levelKey.appendChild(el('div', { className: 'ae-legend-item' },
        el('span', { style: dotStyle }),
        el('span', { className: 'ae-legend-label' }, lvl),
      ));
    }
    wrap.appendChild(levelKey);

    return wrap;
  }

  // ──── Force-directed collaboration layout ────
  function buildCollabLayout(sorted, highlightSet) {
    return buildScatterView(sorted, highlightSet, (nodes, links, n, W, H, isLarge) => {
      const CX = W / 2, CY = H / 2;
      // Initialize positions on a circle
      for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * i) / n;
        nodes[i].x = CX + (W * 0.25) * Math.cos(angle);
        nodes[i].y = CY + (H * 0.25) * Math.sin(angle);
        nodes[i].vx = 0; nodes[i].vy = 0;
      }

      const ITERS = 300;
      const repulsion = isLarge ? 8000 : 15000;
      const attraction = 0.005;
      const damping = 0.92;
      const centerPull = 0.003;
      const wMax = Math.max(1, ...links.map(l => l.weight));

      for (let iter = 0; iter < ITERS; iter++) {
        const alpha = 1 - iter / ITERS;

        // Repulsion (all pairs)
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            let dx = nodes[i].x - nodes[j].x;
            let dy = nodes[i].y - nodes[j].y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const minDist = nodes[i].radius + nodes[j].radius + 8;
            if (dist < minDist) dist = minDist;
            const force = (repulsion * alpha) / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            nodes[i].vx += fx; nodes[i].vy += fy;
            nodes[j].vx -= fx; nodes[j].vy -= fy;
          }
        }

        // Attraction (connected pairs) — normalized weight, log-distance
        for (const link of links) {
          const a = nodes[link.i], b = nodes[link.j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const w = link.weight / wMax;  // normalize to 0..1
          const force = attraction * w * alpha * Math.log(1 + dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }

        // Center gravity
        for (let i = 0; i < n; i++) {
          nodes[i].vx += (CX - nodes[i].x) * centerPull * alpha;
          nodes[i].vy += (CY - nodes[i].y) * centerPull * alpha;
        }

        // Integrate + damp
        for (let i = 0; i < n; i++) {
          nodes[i].vx *= damping; nodes[i].vy *= damping;
          nodes[i].x += nodes[i].vx; nodes[i].y += nodes[i].vy;
        }

        // Collision resolution
        for (let pass = 0; pass < 3; pass++) {
          for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
              const dx = nodes[j].x - nodes[i].x;
              const dy = nodes[j].y - nodes[i].y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
              const minDist = nodes[i].radius + nodes[j].radius + 12;
              if (dist < minDist) {
                const overlap = (minDist - dist) / 2;
                const ux = dx / dist, uy = dy / dist;
                nodes[i].x -= ux * overlap; nodes[i].y -= uy * overlap;
                nodes[j].x += ux * overlap; nodes[j].y += uy * overlap;
              }
            }
          }
        }
      }
    });
  }

  function buildCircleOfCircles(sorted, groups, opts, highlightSet) {
    const wrap = el('div', { className: 'ae-network' });
    const n = sorted.length;
    const ns = 'http://www.w3.org/2000/svg';
    if (n === 0) {
      wrap.appendChild(el('p', { className: 'ae-empty' }, 'No author data available.'));
      return wrap;
    }
    wrap.appendChild(buildNetworkModeToggle());

    const nGroups = groups.length;

    // Author roles for per-member rendering
    const authorRoles = sorted.map(a => {
      const levels = a.credit_levels || [];
      return levels.map(cl => ({
        role: cl.role, level: cl.level,
        color: getRoleCat(cl.role).color,
        opacity: LEVEL_OPACITY[cl.level] || 0.4,
      }));
    });

    // Inter-group links: count shared members or shared roles between groups
    const groupLinks = [];
    for (let i = 0; i < nGroups; i++) {
      for (let j = i + 1; j < nGroups; j++) {
        // Shared members (people in both groups)
        const setI = new Set(groups[i].members);
        let sharedMemberCount = 0;
        for (const mj of groups[j].members) {
          if (setI.has(mj)) sharedMemberCount++;
        }
        // Shared roles across groups
        let sharedRoleCount = 0;
        for (const role of ALL_CREDIT_ROLES) {
          const iHas = groups[i].members.some(mi => findCreditLevel(sorted[mi], role));
          const jHas = groups[j].members.some(mj => findCreditLevel(sorted[mj], role));
          if (iHas && jHas) sharedRoleCount++;
        }
        const weight = sharedMemberCount * 3 + sharedRoleCount;
        if (weight > 0) {
          groupLinks.push({ i, j, sharedMemberCount, sharedRoleCount, weight });
        }
      }
    }

    // Member circle radius — large enough to read initials clearly
    const totalMembers = groups.reduce((s, g) => s + g.members.length, 0);
    const maxGroupSize = Math.max(1, ...groups.map(g => g.members.length));
    const MEMBER_R = totalMembers > 50 ? 14 : totalMembers > 30 ? 17 : totalMembers > 15 ? 20 : 24;
    const GAP = 16; // minimum gap between member circles — room for name labels

    // Compute concentric ring layout for N circles of radius r with gap, returns { rings, outerR }
    function planRings(n, r) {
      if (n === 0) return { rings: [], outerR: 0 };
      if (n === 1) return { rings: [{ count: 1, ringR: 0 }], outerR: r + GAP };
      const d = 2 * r + GAP; // diameter + gap = min center-to-center distance
      const rings = [];
      let placed = 0;
      let ringIdx = 0;
      // First ring can be a single center circle or a small ring
      if (n <= 6) {
        // All on one ring
        const ringR = d / (2 * Math.sin(Math.PI / n));
        rings.push({ count: n, ringR });
        return { rings, outerR: ringR + r + GAP };
      }
      // Center circle
      rings.push({ count: 1, ringR: 0 });
      placed = 1;
      ringIdx = 1;
      let currentR = d; // first ring radius
      while (placed < n) {
        // How many fit on this ring? circumference / min-arc-distance
        const circumference = 2 * Math.PI * currentR;
        const maxOnRing = Math.max(1, Math.floor(circumference / d));
        const needed = n - placed;
        const count = Math.min(maxOnRing, needed);
        rings.push({ count, ringR: currentR });
        placed += count;
        currentR += d; // next ring
        ringIdx++;
      }
      const lastRing = rings[rings.length - 1];
      return { rings, outerR: lastRing.ringR + r + GAP };
    }

    // Compute group radii first
    const groupRadii = groups.map(g => {
      const { outerR } = planRings(g.members.length, MEMBER_R);
      return Math.max(MEMBER_R + 14, outerR + 6);
    });

    // Compute minimum orbit so no adjacent groups overlap (with 10px margin)
    const MARGIN = 12;
    let minOrbit = 0;
    if (nGroups >= 2) {
      for (let i = 0; i < nGroups; i++) {
        const j = (i + 1) % nGroups;
        const angleDiff = 2 * Math.PI / nGroups;
        // distance between centers on orbit = orbit * 2 * sin(angleDiff/2)
        const needed = (groupRadii[i] + groupRadii[j] + MARGIN) / (2 * Math.sin(angleDiff / 2));
        if (needed > minOrbit) minOrbit = needed;
      }
    }

    // SVG dimensions — auto-scale to fit all groups without overlap
    const maxR = Math.max(...groupRadii);
    const ORBIT = Math.max(minOrbit, maxR + 40);
    const W = Math.max(800, 2 * (ORBIT + maxR + 50));
    const H = Math.max(700, 2 * (ORBIT + maxR + 50));
    const CX = W / 2, CY = H / 2;

    // Group positions
    const groupData = groups.map((g, i) => {
      const angle = (2 * Math.PI * i) / nGroups - Math.PI / 2;
      return { ...g, x: CX + ORBIT * Math.cos(angle), y: CY + ORBIT * Math.sin(angle), radius: groupRadii[i], angle };
    });

    // Pack author circles inside a group circle — non-overlapping concentric rings
    function packMembers(gd) {
      const mLen = gd.members.length;
      if (mLen === 0) return [];
      const { rings } = planRings(mLen, MEMBER_R);
      const positions = [];
      let placed = 0;
      for (const ring of rings) {
        for (let i = 0; i < ring.count && placed < mLen; i++) {
          const a = ring.ringR === 0 ? 0 : (2 * Math.PI * i) / ring.count - Math.PI / 2;
          positions.push({
            x: gd.x + ring.ringR * Math.cos(a),
            y: gd.y + ring.ringR * Math.sin(a),
            r: MEMBER_R,
          });
          placed++;
        }
      }
      return positions;
    }

    // State
    let hoveredGroup = null;
    let expandedGroup = null;
    let hoveredMember = null;      // used in expanded view
    let hoveredOverviewMember = null; // { groupIdx, memberIdx, authorIdx } in overview

    function renderSVG() {
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('class', 'ae-network-svg');
      svg.style.width = '100%'; svg.style.maxWidth = W + 'px';
      svg.style.height = 'auto'; svg.style.display = 'block'; svg.style.margin = '0 auto';

      // Background
      const defs = document.createElementNS(ns, 'defs');
      const grad = document.createElementNS(ns, 'radialGradient');
      grad.setAttribute('id', 'ae-bg-glow-cc');
      grad.setAttribute('cx', '50%'); grad.setAttribute('cy', '45%'); grad.setAttribute('r', '55%');
      const s1 = document.createElementNS(ns, 'stop');
      s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', isDark ? '#312e81' : '#dbe4ff'); s1.setAttribute('stop-opacity', '0.2');
      const s2 = document.createElementNS(ns, 'stop');
      s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', isDark ? '#1f2937' : 'white'); s2.setAttribute('stop-opacity', '0');
      grad.appendChild(s1); grad.appendChild(s2); defs.appendChild(grad); svg.appendChild(defs);
      const bgRect = document.createElementNS(ns, 'rect');
      bgRect.setAttribute('x', '0'); bgRect.setAttribute('y', '0');
      bgRect.setAttribute('width', String(W)); bgRect.setAttribute('height', String(H));
      bgRect.setAttribute('fill', 'url(#ae-bg-glow-cc)');
      svg.appendChild(bgRect);

      if (expandedGroup === null) {
        // ── Overview: group circles with member dots inside ──

        // Inter-group chords — clipped to group circle edges
        for (const link of groupLinks) {
          const s = groupData[link.i], t = groupData[link.j];
          const isHL = hoveredGroup === link.i || hoveredGroup === link.j;
          const isDim = hoveredGroup !== null && !isHL;
          const baseOpacity = isDim ? 0.03 : isHL ? 0.35 : 0.1;
          const dx = t.x - s.x, dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const ux = dx / dist, uy = dy / dist;
          const sx = s.x + ux * s.radius, sy = s.y + uy * s.radius;
          const tx = t.x - ux * t.radius, ty = t.y - uy * t.radius;
          const midX = (sx + tx) / 2 + (CX - (sx + tx) / 2) * 0.3;
          const midY = (sy + ty) / 2 + (CY - (sy + ty) / 2) * 0.3;
          const thickness = Math.min(8, 1.5 + link.weight * 0.2);
          const path = document.createElementNS(ns, 'path');
          path.setAttribute('d', `M${sx},${sy} Q${midX},${midY} ${tx},${ty}`);
          path.setAttribute('fill', 'none'); path.setAttribute('stroke', s.color);
          path.setAttribute('stroke-width', String(thickness));
          path.setAttribute('stroke-opacity', String(baseOpacity));
          path.setAttribute('stroke-linecap', 'round'); path.setAttribute('class', 'ae-chord');
          svg.appendChild(path);
        }

        // Group circles with packed member dots
        for (let idx = 0; idx < nGroups; idx++) {
          const gd = groupData[idx];
          if (gd.members.length === 0) continue;
          const isHovered = hoveredGroup === idx;
          const isDim = hoveredGroup !== null && !isHovered;
          const g = document.createElementNS(ns, 'g');
          g.style.cursor = 'pointer'; g.style.opacity = String(isDim ? 0.3 : 1);
          g.style.transition = 'opacity 0.2s';

          // Outer container circle
          const outerCircle = document.createElementNS(ns, 'circle');
          outerCircle.setAttribute('cx', String(gd.x)); outerCircle.setAttribute('cy', String(gd.y));
          outerCircle.setAttribute('r', String(gd.radius));
          outerCircle.setAttribute('fill', gd.color); outerCircle.setAttribute('fill-opacity', '0.08');
          outerCircle.setAttribute('stroke', gd.color);
          outerCircle.setAttribute('stroke-width', isHovered ? '2.5' : '1.5');
          outerCircle.setAttribute('stroke-opacity', isHovered ? '0.7' : '0.35');
          g.appendChild(outerCircle);

          // Pack author circles inside (same style as Authors chord)
          const memberPositions = packMembers(gd);
          for (let mi = 0; mi < memberPositions.length; mi++) {
            const mp = memberPositions[mi];
            const authorIdx = gd.members[mi];
            const author = sorted[authorIdx];
            const isMemberHovered = hoveredOverviewMember &&
              hoveredOverviewMember.groupIdx === idx && hoveredOverviewMember.memberIdx === mi;
            const isSearchDimmed = highlightSet && !highlightSet.has(authorIdx);

            const mg = document.createElementNS(ns, 'g');
            mg.style.cursor = 'pointer';
            mg.style.transition = 'transform 0.15s, opacity 0.2s';
            if (isSearchDimmed) mg.style.opacity = '0.15';

            // Shadow
            const shadow = document.createElementNS(ns, 'circle');
            shadow.setAttribute('cx', String(mp.x)); shadow.setAttribute('cy', String(mp.y + 1));
            shadow.setAttribute('r', String(mp.r)); shadow.setAttribute('fill', 'black');
            shadow.setAttribute('opacity', '0.08');
            mg.appendChild(shadow);

            // Colored circle
            const dot = document.createElementNS(ns, 'circle');
            dot.setAttribute('cx', String(mp.x)); dot.setAttribute('cy', String(mp.y));
            dot.setAttribute('r', String(mp.r));
            dot.setAttribute('fill', getColor(author.name));
            dot.setAttribute('stroke', isMemberHovered ? getColor(author.name) : (isDark ? '#374151' : 'white'));
            dot.setAttribute('stroke-width', isMemberHovered ? '3' : '2');
            if (isMemberHovered) dot.setAttribute('stroke-opacity', '0.5');
            mg.appendChild(dot);

            // Hover ring
            if (isMemberHovered) {
              const hRing = document.createElementNS(ns, 'circle');
              hRing.setAttribute('cx', String(mp.x)); hRing.setAttribute('cy', String(mp.y));
              hRing.setAttribute('r', String(mp.r + 3));
              hRing.setAttribute('fill', 'none');
              hRing.setAttribute('stroke', getColor(author.name));
              hRing.setAttribute('stroke-width', '2'); hRing.setAttribute('opacity', '0.5');
              mg.appendChild(hRing);
            }

            // Avatar image or initials fallback
            appendSvgAvatar(svg, mg, ns, mp.x, mp.y, mp.r, author, Math.max(8, mp.r * 0.6));

            // Name label — always show last name, full name on hover
            const nl = document.createElementNS(ns, 'text');
            nl.setAttribute('x', String(mp.x)); nl.setAttribute('y', String(mp.y + mp.r + 12));
            nl.setAttribute('text-anchor', 'middle');
            nl.setAttribute('fill', isMemberHovered ? (isDark ? '#e2e8f0' : '#1e3a5f') : (isDark ? '#c4cad4' : '#64748b'));
            nl.setAttribute('font-size', '8');
            nl.setAttribute('font-weight', isMemberHovered ? '600' : '400');
            nl.setAttribute('font-family', 'Inter, system-ui, sans-serif');
            nl.style.pointerEvents = 'none';
            nl.textContent = isMemberHovered ? author.name : getLastName(author.name);
            mg.appendChild(nl);

            // Member hover & click
            mg.addEventListener('mouseenter', (e) => {
              e.stopPropagation();
              hoveredOverviewMember = { groupIdx: idx, memberIdx: mi, authorIdx };
              hoveredGroup = idx;
              rerenderNetwork();
            });
            mg.addEventListener('mouseleave', (e) => {
              e.stopPropagation();
              hoveredOverviewMember = null;
              rerenderNetwork();
            });
            mg.addEventListener('click', (e) => {
              e.stopPropagation();
              // Expand this group and highlight this member
              expandedGroup = idx; hoveredGroup = null;
              hoveredMember = mi; hoveredOverviewMember = null;
              rerenderNetwork();
            });

            g.appendChild(mg);
          }

          // Group label below
          const label = document.createElementNS(ns, 'text');
          label.setAttribute('x', String(gd.x)); label.setAttribute('y', String(gd.y + gd.radius + 14));
          label.setAttribute('text-anchor', 'middle');
          label.setAttribute('fill', isHovered ? (isDark ? '#e2e8f0' : '#1e3a5f') : (isDark ? '#cbd5e1' : '#475569'));
          const labelFontSize = nGroups > 10 ? '8' : '10';
          label.setAttribute('font-size', labelFontSize); label.setAttribute('font-weight', isHovered ? '600' : '500');
          label.setAttribute('font-family', 'Inter, system-ui, sans-serif');
          label.style.pointerEvents = 'none';
          const maxLen = nGroups > 10 ? 18 : 26;
          label.textContent = gd.label.length > maxLen ? gd.label.slice(0, maxLen - 2) + '…' : gd.label;
          g.appendChild(label);

          // Count badge
          const countLabel = document.createElementNS(ns, 'text');
          countLabel.setAttribute('x', String(gd.x)); countLabel.setAttribute('y', String(gd.y + gd.radius + (nGroups > 10 ? 23 : 26)));
          countLabel.setAttribute('text-anchor', 'middle'); countLabel.setAttribute('fill', '#94a3b8');
          countLabel.setAttribute('font-size', nGroups > 10 ? '7' : '8.5');
          countLabel.setAttribute('font-family', 'Inter, system-ui, sans-serif');
          countLabel.style.pointerEvents = 'none';
          countLabel.textContent = `${gd.members.length} contributor${gd.members.length > 1 ? 's' : ''}`;
          g.appendChild(countLabel);

          // Hover hint
          if (isHovered) {
            const hint = document.createElementNS(ns, 'text');
            hint.setAttribute('x', String(gd.x)); hint.setAttribute('y', String(gd.y + gd.radius + (nGroups > 10 ? 32 : 38)));
            hint.setAttribute('text-anchor', 'middle'); hint.setAttribute('fill', '#94a3b8');
            hint.setAttribute('font-size', '8'); hint.setAttribute('font-style', 'italic');
            hint.setAttribute('font-family', 'Inter, system-ui, sans-serif');
            hint.style.pointerEvents = 'none'; hint.textContent = 'click to expand';
            g.appendChild(hint);
          }

          g.addEventListener('mouseenter', () => { hoveredGroup = idx; rerenderNetwork(); });
          g.addEventListener('mouseleave', () => { hoveredGroup = null; rerenderNetwork(); });
          g.addEventListener('click', (e) => {
            e.stopPropagation();
            expandedGroup = idx; hoveredGroup = null; hoveredMember = null; rerenderNetwork();
          });
          svg.appendChild(g);
        }

      } else {
        // ── Expanded: show members of selected group ──
        const gd = groupData[expandedGroup];
        const members = gd.members;
        const mLen = members.length;
        const isLargeGroup = mLen > 15;

        // Dimmed other groups on periphery
        for (let idx = 0; idx < nGroups; idx++) {
          if (idx === expandedGroup) continue;
          const od = groupData[idx];
          if (od.members.length === 0) continue;
          const g = document.createElementNS(ns, 'g');
          g.style.cursor = 'pointer'; g.style.opacity = '0.25';
          const sR = 16;
          const circle = document.createElementNS(ns, 'circle');
          circle.setAttribute('cx', String(od.x)); circle.setAttribute('cy', String(od.y));
          circle.setAttribute('r', String(sR)); circle.setAttribute('fill', od.color);
          circle.setAttribute('stroke', isDark ? '#374151' : 'white'); circle.setAttribute('stroke-width', '2');
          g.appendChild(circle);
          const cnt = document.createElementNS(ns, 'text');
          cnt.setAttribute('x', String(od.x)); cnt.setAttribute('y', String(od.y + 1));
          cnt.setAttribute('text-anchor', 'middle'); cnt.setAttribute('dominant-baseline', 'central');
          cnt.setAttribute('fill', '#fff'); cnt.setAttribute('font-size', '9');
          cnt.setAttribute('font-weight', '700'); cnt.setAttribute('font-family', 'Inter, system-ui, sans-serif');
          cnt.style.pointerEvents = 'none'; cnt.textContent = String(od.members.length);
          g.appendChild(cnt);
          const lbl = document.createElementNS(ns, 'text');
          lbl.setAttribute('x', String(od.x)); lbl.setAttribute('y', String(od.y + sR + 12));
          lbl.setAttribute('text-anchor', 'middle'); lbl.setAttribute('fill', '#94a3b8');
          lbl.setAttribute('font-size', '8'); lbl.setAttribute('font-family', 'Inter, system-ui, sans-serif');
          lbl.style.pointerEvents = 'none';
          lbl.textContent = od.label.length > 16 ? od.label.slice(0, 13) + '…' : od.label;
          g.appendChild(lbl);
          g.addEventListener('click', (e) => {
            e.stopPropagation();
            expandedGroup = idx; hoveredMember = null; rerenderNetwork();
          });
          svg.appendChild(g);
        }

        // Title
        const title = document.createElementNS(ns, 'text');
        title.setAttribute('x', String(CX)); title.setAttribute('y', '28');
        title.setAttribute('text-anchor', 'middle'); title.setAttribute('fill', gd.color);
        title.setAttribute('font-size', '14'); title.setAttribute('font-weight', '700');
        title.setAttribute('font-family', 'Inter, system-ui, sans-serif');
        title.textContent = `${gd.label} — ${mLen} contributor${mLen > 1 ? 's' : ''}`;
        svg.appendChild(title);

        // Back button
        const backG = document.createElementNS(ns, 'g');
        backG.style.cursor = 'pointer';
        const backBg = document.createElementNS(ns, 'rect');
        backBg.setAttribute('x', '10'); backBg.setAttribute('y', '10');
        backBg.setAttribute('width', '75'); backBg.setAttribute('height', '24');
        backBg.setAttribute('rx', '12'); backBg.setAttribute('fill', isDark ? '#334155' : '#f1f5f9');
        backBg.setAttribute('stroke', isDark ? '#475569' : '#e2e8f0'); backBg.setAttribute('stroke-width', '1');
        backG.appendChild(backBg);
        const backTxt = document.createElementNS(ns, 'text');
        backTxt.setAttribute('x', '47'); backTxt.setAttribute('y', '26');
        backTxt.setAttribute('text-anchor', 'middle'); backTxt.setAttribute('fill', isDark ? '#cbd5e1' : '#475569');
        backTxt.setAttribute('font-size', '11'); backTxt.setAttribute('font-weight', '500');
        backTxt.setAttribute('font-family', 'Inter, system-ui, sans-serif');
        backTxt.textContent = '← All';
        backG.appendChild(backTxt);
        backG.addEventListener('click', (e) => {
          e.stopPropagation();
          expandedGroup = null; hoveredMember = null; rerenderNetwork();
        });
        svg.appendChild(backG);

        // Member positions
        const memberOrbit = mLen === 1 ? 0 : Math.min(ORBIT * 0.75, 50 + mLen * 10);
        const maxRoles = Math.max(1, ...members.map(mi => authorRoles[mi].length));
        const memberNodes = members.map((mi, i) => {
          const angle = mLen === 1 ? 0 : (2 * Math.PI * i) / mLen - Math.PI / 2;
          const roles = authorRoles[mi];
          const weight = roles.length + (sorted[mi].section_contributions || []).length;
          const minR = isLargeGroup ? 11 : 18;
          const maxR = isLargeGroup ? 22 : 36;
          const radius = minR + ((weight / (maxRoles + 8)) * (maxR - minR));
          return {
            x: CX + memberOrbit * Math.cos(angle), y: CY + memberOrbit * Math.sin(angle),
            radius, roles, mi,
            name: sorted[mi].name,
            firstName: getFirstName(sorted[mi].name), lastName: getLastName(sorted[mi].name),
            careerStage: sorted[mi].career_stage || '',
            roleCount: roles.length, secCount: (sorted[mi].section_contributions || []).length,
            color: getColor(sorted[mi].name),
          };
        });

        // Intra-group edges — clipped to node edges
        for (let a = 0; a < mLen; a++) {
          for (let b = a + 1; b < mLen; b++) {
            const ai = members[a], bi = members[b];
            const sharedRoles = [];
            for (const role of ALL_CREDIT_ROLES) {
              if (findCreditLevel(sorted[ai], role) && findCreditLevel(sorted[bi], role))
                sharedRoles.push({ role, color: getRoleCat(role).color });
            }
            if (sharedRoles.length === 0) continue;
            const s = memberNodes[a], t = memberNodes[b];
            const isHL = hoveredMember === a || hoveredMember === b;
            const isDim = hoveredMember !== null && !isHL;
            const baseOpacity = isDim ? 0.03 : isHL ? 0.5 : 0.12;
            const dx = t.x - s.x, dy = t.y - s.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const ux = dx / len, uy = dy / len;
            const nx = -uy, ny = ux;
            const sx = s.x + ux * (s.radius + 5), sy = s.y + uy * (s.radius + 5);
            const tx = t.x - ux * (t.radius + 5), ty = t.y - uy * (t.radius + 5);
            const midX = (sx + tx) / 2 + (CX - (sx + tx) / 2) * 0.25;
            const midY = (sy + ty) / 2 + (CY - (sy + ty) / 2) * 0.25;
            const strandW = 2, gap = strandW + 0.8;
            const bandW = sharedRoles.length * gap;
            let offset = -bandW / 2 + gap / 2;
            for (const sr of sharedRoles) {
              const ox = nx * offset, oy = ny * offset;
              const path = document.createElementNS(ns, 'path');
              path.setAttribute('d', `M${sx + ox},${sy + oy} Q${midX + ox},${midY + oy} ${tx + ox},${ty + oy}`);
              path.setAttribute('fill', 'none'); path.setAttribute('stroke', sr.color);
              path.setAttribute('stroke-width', String(strandW));
              path.setAttribute('stroke-opacity', String(baseOpacity));
              path.setAttribute('stroke-linecap', 'round'); path.setAttribute('class', 'ae-chord');
              svg.appendChild(path);
              offset += gap;
            }
          }
        }

        // Member nodes
        for (let idx = 0; idx < mLen; idx++) {
          const nd = memberNodes[idx];
          const isHovered = hoveredMember === idx;
          const isDim = hoveredMember !== null && !isHovered;
          const isSearchDimmed = highlightSet && !highlightSet.has(nd.mi);
          const g = document.createElementNS(ns, 'g');
          g.style.cursor = 'pointer'; g.style.opacity = String(isSearchDimmed ? 0.15 : isDim ? 0.3 : 1);
          g.style.transition = 'opacity 0.2s';

          // Group-color halo
          const halo = document.createElementNS(ns, 'circle');
          halo.setAttribute('cx', String(nd.x)); halo.setAttribute('cy', String(nd.y));
          halo.setAttribute('r', String(nd.radius + 5));
          halo.setAttribute('fill', 'none'); halo.setAttribute('stroke', gd.color);
          halo.setAttribute('stroke-width', '2.5'); halo.setAttribute('opacity', isHovered ? '0.6' : '0.2');
          g.appendChild(halo);

          // Role ring arcs
          const ringR = nd.radius + 8;
          const roles = nd.roles;
          if (roles.length > 0) {
            const arcGap = 0.06;
            const totalAngle = 2 * Math.PI - roles.length * arcGap;
            const segAngle = totalAngle / roles.length;
            for (let ri = 0; ri < roles.length; ri++) {
              const startA = -Math.PI / 2 + ri * (segAngle + arcGap);
              const endA = startA + segAngle;
              const arcS = { x: nd.x + ringR * Math.cos(startA), y: nd.y + ringR * Math.sin(startA) };
              const arcE = { x: nd.x + ringR * Math.cos(endA), y: nd.y + ringR * Math.sin(endA) };
              const largeArc = (endA - startA) > Math.PI ? 1 : 0;
              const arc = document.createElementNS(ns, 'path');
              arc.setAttribute('d', `M ${arcS.x} ${arcS.y} A ${ringR} ${ringR} 0 ${largeArc} 1 ${arcE.x} ${arcE.y}`);
              arc.setAttribute('stroke', roles[ri].color); arc.setAttribute('stroke-width', '3');
              arc.setAttribute('stroke-linecap', 'round'); arc.setAttribute('fill', 'none');
              arc.setAttribute('opacity', String(roles[ri].opacity));
              g.appendChild(arc);
            }
          }

          // Shadow + circle
          const shadow = document.createElementNS(ns, 'circle');
          shadow.setAttribute('cx', String(nd.x)); shadow.setAttribute('cy', String(nd.y + 1));
          shadow.setAttribute('r', String(nd.radius)); shadow.setAttribute('fill', 'black'); shadow.setAttribute('opacity', '0.06');
          g.appendChild(shadow);
          const circle = document.createElementNS(ns, 'circle');
          circle.setAttribute('cx', String(nd.x)); circle.setAttribute('cy', String(nd.y));
          circle.setAttribute('r', String(nd.radius)); circle.setAttribute('fill', nd.color);
          circle.setAttribute('stroke', isDark ? '#374151' : 'white'); circle.setAttribute('stroke-width', '2');
          g.appendChild(circle);

          // Avatar image or initials fallback
          appendSvgAvatar(svg, g, ns, nd.x, nd.y, nd.radius, sorted[nd.mi], nd.radius * 0.55);

          // Name
          const label = document.createElementNS(ns, 'text');
          label.setAttribute('x', String(nd.x)); label.setAttribute('y', String(nd.y + nd.radius + (isLargeGroup ? 12 : 16)));
          label.setAttribute('text-anchor', 'middle');
          label.setAttribute('fill', isHovered ? (isDark ? '#e2e8f0' : '#1e3a5f') : (isDark ? '#c4cad4' : '#64748b'));
          label.setAttribute('font-size', isLargeGroup ? '8' : '10');
          label.setAttribute('font-weight', isHovered ? '600' : '400');
          label.setAttribute('font-family', 'Inter, system-ui, sans-serif');
          label.style.pointerEvents = 'none';
          label.textContent = isLargeGroup ? nd.lastName : `${nd.firstName} ${nd.lastName}`;
          g.appendChild(label);

          if (isHovered && nd.careerStage) {
            const cs = document.createElementNS(ns, 'text');
            cs.setAttribute('x', String(nd.x)); cs.setAttribute('y', String(nd.y + nd.radius + 28));
            cs.setAttribute('text-anchor', 'middle'); cs.setAttribute('fill', '#94a3b8');
            cs.setAttribute('font-size', '9'); cs.setAttribute('font-family', 'Inter, system-ui, sans-serif');
            cs.style.pointerEvents = 'none'; cs.textContent = nd.careerStage;
            g.appendChild(cs);
          }

          g.addEventListener('mouseenter', () => { hoveredMember = idx; rerenderNetwork(); });
          g.addEventListener('mouseleave', () => { hoveredMember = null; rerenderNetwork(); });
          svg.appendChild(g);
        }
      }

      return svg;
    }

    function renderInfoCard() {
      // Overview: hovering a specific member circle
      if (expandedGroup === null && hoveredOverviewMember) {
        const mi = hoveredOverviewMember.authorIdx;
        const roles = authorRoles[mi];
        const gd = groupData[hoveredOverviewMember.groupIdx];
        const onRight = gd.x > CX; const onBottom = gd.y > CY;
        const cardStyle = {};
        if (onRight) { cardStyle.left = '12px'; cardStyle.right = 'auto'; }
        else { cardStyle.right = '56px'; cardStyle.left = 'auto'; }
        if (onBottom) { cardStyle.top = '12px'; cardStyle.bottom = 'auto'; }
        else { cardStyle.bottom = '12px'; cardStyle.top = 'auto'; }
        const card = el('div', { className: 'ae-info-card', style: cardStyle });
        const avatarRow = el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } });
        avatarRow.appendChild(buildHtmlAvatar(sorted[mi], 'ae-info-avatar', { width: '40px', height: '40px', borderRadius: '50%', flexShrink: '0' }));
        avatarRow.appendChild(el('div', {},
          el('p', { className: 'ae-info-name' }, sorted[mi].name),
          el('p', { className: 'ae-info-stage' }, sorted[mi].career_stage || ''),
        ));
        card.appendChild(avatarRow);
        card.appendChild(el('div', { className: 'ae-info-stats' },
            el('p', {}, el('strong', {}, String(roles.length)), ' CRediT roles'),
            el('p', {}, el('strong', {}, String((sorted[mi].section_contributions || []).length)), ' sections'),
          ),
        );
        const badges = el('div', { className: 'ae-info-badges' });
        for (const r of roles) {
          badges.appendChild(el('span', {
            className: 'ae-info-badge',
            style: { backgroundColor: r.color, opacity: r.opacity },
          }, r.role.replace('Writing – ', 'W: ').replace('Formal ', '').slice(0, 14)));
        }
        card.appendChild(badges);
        return card;
      }
      // Overview: hovering a group (but not a specific member)
      if (expandedGroup === null && hoveredGroup !== null && !hoveredOverviewMember) {
        const gd = groupData[hoveredGroup];
        const onRight = gd.x > CX; const onBottom = gd.y > CY;
        const cardStyle = {};
        if (onRight) { cardStyle.left = '12px'; cardStyle.right = 'auto'; }
        else { cardStyle.right = '56px'; cardStyle.left = 'auto'; }
        if (onBottom) { cardStyle.top = '12px'; cardStyle.bottom = 'auto'; }
        else { cardStyle.bottom = '12px'; cardStyle.top = 'auto'; }
        const memberNames = gd.members.map(mi => sorted[mi].name).join(', ');
        const card = el('div', { className: 'ae-info-card', style: cardStyle },
          el('p', { className: 'ae-info-name' }, gd.label),
          el('p', { className: 'ae-info-stage' }, `${gd.members.length} contributor${gd.members.length > 1 ? 's' : ''}`),
        );
        card.appendChild(el('p', {
          style: { fontSize: '10px', color: isDark ? '#94a3b8' : '#64748b', marginTop: '4px', lineHeight: '1.3' }
        }, memberNames));
        return card;
      }
      if (expandedGroup !== null && hoveredMember !== null) {
        const gd = groupData[expandedGroup];
        const mi = gd.members[hoveredMember];
        if (mi === undefined) return null;
        const roles = authorRoles[mi];
        const card = el('div', { className: 'ae-info-card', style: { right: '56px', top: '12px' } });
        const avatarRow = el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } });
        avatarRow.appendChild(buildHtmlAvatar(sorted[mi], 'ae-info-avatar', { width: '40px', height: '40px', borderRadius: '50%', flexShrink: '0' }));
        avatarRow.appendChild(el('div', {},
          el('p', { className: 'ae-info-name' }, sorted[mi].name),
          el('p', { className: 'ae-info-stage' }, sorted[mi].career_stage || ''),
        ));
        card.appendChild(avatarRow);
        card.appendChild(el('div', { className: 'ae-info-stats' },
            el('p', {}, el('strong', {}, String(roles.length)), ' CRediT roles'),
            el('p', {}, el('strong', {}, String((sorted[mi].section_contributions || []).length)), ' sections'),
          ),
        );
        const badges = el('div', { className: 'ae-info-badges' });
        for (const r of roles) {
          badges.appendChild(el('span', {
            className: 'ae-info-badge',
            style: { backgroundColor: r.color, opacity: r.opacity },
          }, r.role.replace('Writing – ', 'W: ').replace('Formal ', '').slice(0, 14)));
        }
        card.appendChild(badges);
        return card;
      }
      return null;
    }

    // Graph container with zoom/pan
    const graphWrap = el('div', { className: 'ae-network-graph' });
    let vbX = 0, vbY = 0, vbW = W, vbH = H;
    let isPanning = false, panStartX = 0, panStartY = 0, panStartVbX = 0, panStartVbY = 0;
    function applyViewBox() {
      const svg = graphWrap.querySelector('.ae-network-svg');
      if (svg) svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
    }
    graphWrap.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const newW = Math.max(W * 0.2, Math.min(W * 2, vbW * factor));
      const newH = Math.max(H * 0.2, Math.min(H * 2, vbH * factor));
      const rect = graphWrap.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;
      vbX += (vbW - newW) * mx; vbY += (vbH - newH) * my;
      vbW = newW; vbH = newH; applyViewBox();
    }, { passive: false });
    graphWrap.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isPanning = true; panStartX = e.clientX; panStartY = e.clientY;
      panStartVbX = vbX; panStartVbY = vbY; graphWrap.style.cursor = 'grabbing';
    });
    graphWrap.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      const rect = graphWrap.getBoundingClientRect();
      vbX = panStartVbX - (e.clientX - panStartX) * (vbW / rect.width);
      vbY = panStartVbY - (e.clientY - panStartY) * (vbH / rect.height);
      applyViewBox();
    });
    const stopPan = () => { isPanning = false; graphWrap.style.cursor = 'grab'; };
    graphWrap.addEventListener('mouseup', stopPan);
    graphWrap.addEventListener('mouseleave', stopPan);
    const zoomControls = el('div', { className: 'ae-zoom-controls' });
    zoomControls.appendChild(el('button', { className: 'ae-zoom-btn', title: 'Zoom in',
      onClick: () => { const nW = Math.max(W*0.2, vbW*0.7), nH = Math.max(H*0.2, vbH*0.7); vbX += (vbW-nW)/2; vbY += (vbH-nH)/2; vbW = nW; vbH = nH; applyViewBox(); },
    }, '+'));
    zoomControls.appendChild(el('button', { className: 'ae-zoom-btn', title: 'Zoom out',
      onClick: () => { const nW = Math.min(W*2, vbW*1.4), nH = Math.min(H*2, vbH*1.4); vbX += (vbW-nW)/2; vbY += (vbH-nH)/2; vbW = nW; vbH = nH; applyViewBox(); },
    }, '−'));
    zoomControls.appendChild(el('button', { className: 'ae-zoom-btn', title: 'Reset zoom',
      onClick: () => { vbX = 0; vbY = 0; vbW = W; vbH = H; applyViewBox(); },
    }, '⟲'));
    graphWrap.appendChild(zoomControls);

    function rerenderNetwork() {
      const oldSvg = graphWrap.querySelector('.ae-network-svg');
      const newSvg = renderSVG();
      newSvg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
      if (oldSvg) oldSvg.replaceWith(newSvg); else graphWrap.appendChild(newSvg);
      const oldCard = graphWrap.querySelector('.ae-info-card');
      const newCard = renderInfoCard();
      if (oldCard) { if (newCard) oldCard.replaceWith(newCard); else oldCard.remove(); }
      else if (newCard) graphWrap.appendChild(newCard);
    }
    rerenderNetwork();
    wrap.appendChild(graphWrap);

    // Stats
    const stats = el('div', { className: 'ae-network-stats' });
    stats.appendChild(el('div', { className: 'ae-stat' },
      el('span', { className: 'ae-stat-value' }, String(nGroups)),
      el('span', { className: 'ae-stat-label' }, opts.groupLabel || 'Groups')
    ));
    stats.appendChild(el('div', { className: 'ae-stat' },
      el('span', { className: 'ae-stat-value' }, String(n)),
      el('span', { className: 'ae-stat-label' }, 'Contributors')
    ));
    stats.appendChild(el('div', { className: 'ae-stat' },
      el('span', { className: 'ae-stat-value' }, String(groupLinks.length)),
      el('span', { className: 'ae-stat-label' }, opts.linkLabel || 'Links')
    ));
    wrap.appendChild(stats);

    return wrap;
  }
  // ──── Institution circle-of-circles ────
  function buildInstitutionChord(sorted, highlightSet) {
    const n = sorted.length;
    // Group by institution name
    function iKey(aff) { return typeof aff === 'string' ? aff : (aff.name || aff.id || JSON.stringify(aff)); }
    function iName(aff) { return typeof aff === 'string' ? aff : (aff.name || aff.id || '?'); }

    const INST_COLORS = [
      '#4c6ef5', '#10b981', '#f59e0b', '#e11d48', '#8b5cf6', '#0ea5e9',
      '#d97706', '#059669', '#7c3aed', '#ec4899', '#14b8a6', '#f43f5e',
      '#6366f1', '#22c55e', '#eab308', '#ef4444',
    ];

    const instMap = new Map();
    for (let i = 0; i < n; i++) {
      const affs = sorted[i].affiliations || [];
      if (affs.length === 0) {
        if (!instMap.has('__none__')) instMap.set('__none__', { name: 'Unaffiliated', members: new Set() });
        instMap.get('__none__').members.add(i);
      } else {
        for (const aff of affs) {
          const key = iKey(aff);
          if (!instMap.has(key)) instMap.set(key, { name: iName(aff), members: new Set() });
          instMap.get(key).members.add(i);
        }
      }
    }

    const groups = [...instMap.values()]
      .filter(g => g.members.size > 0)
      .map((g, idx) => ({
        label: g.name,
        color: INST_COLORS[idx % INST_COLORS.length],
        members: [...g.members],
      }));

    return buildCircleOfCircles(sorted, groups, { groupLabel: 'Institutions', linkLabel: 'Cross-inst links' }, highlightSet);
  }

  // ──── By Role circle-of-circles ────
  function buildForceGraph(sorted, highlightSet) {
    const n = sorted.length;

    const groups = ALL_CREDIT_ROLES.map(role => {
      const rc = getRoleCat(role);
      const members = [];
      for (let i = 0; i < n; i++) {
        if (findCreditLevel(sorted[i], role)) members.push(i);
      }
      return { label: role, color: rc.color, members };
    }).filter(g => g.members.length > 0);

    return buildCircleOfCircles(sorted, groups, { groupLabel: 'Roles', linkLabel: 'Shared contributors' }, highlightSet);
  }

  // ──── By Section & Figure circle-of-circles ────
  function buildSectionCircles(sorted, highlightSet) {
    const n = sorted.length;

    const SECTION_COLORS = [
      '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
      '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#4c6ef5',
    ];
    const FIGURE_COLORS = [
      '#f59e0b', '#fbbf24', '#f97316', '#fb923c', '#fca5a1',
    ];

    function figureLabel(id) {
      return id.replace(/^fig-/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    // Section groups
    const sectionMap = new Map();
    for (let i = 0; i < n; i++) {
      const secs = sorted[i].section_contributions || [];
      for (const sc of secs) {
        if (!sectionMap.has(sc.section)) sectionMap.set(sc.section, new Set());
        sectionMap.get(sc.section).add(i);
      }
    }
    const sectionGroups = [...sectionMap.entries()]
      .filter(([, members]) => members.size > 0)
      .map(([sectionId, members], idx) => ({
        label: sectionLabel(sectionId),
        color: SECTION_COLORS[idx % SECTION_COLORS.length],
        members: [...members],
      }));

    // Figure groups
    const figMap = new Map();
    for (let i = 0; i < n; i++) {
      const figs = sorted[i].figure_contributions || [];
      for (const fc of figs) {
        if (!figMap.has(fc.figure)) figMap.set(fc.figure, new Set());
        figMap.get(fc.figure).add(i);
      }
    }
    const figureGroups = [...figMap.entries()]
      .filter(([, members]) => members.size > 0)
      .map(([figId, members], idx) => ({
        label: '📊 ' + figureLabel(figId),
        color: FIGURE_COLORS[idx % FIGURE_COLORS.length],
        members: [...members],
      }));

    const groups = [...sectionGroups, ...figureGroups];

    return buildCircleOfCircles(sorted, groups, { groupLabel: 'Sections & Figures', linkLabel: 'Shared contributors' }, highlightSet);
  }

  // ──── Timeline tab ────
  function buildTimelineTab(sorted) {
    const wrap = el('div', { className: 'ae-timeline' });

    // Find date range
    const authorDates = sorted
      .filter(a => a.timeline?.joined)
      .map(a => ({
        author: a,
        start: a.timeline.joined,
        end: a.timeline.left || '2026-06',
        milestones: a.timeline.milestones || [],
      }));

    if (authorDates.length === 0) {
      wrap.appendChild(el('p', { className: 'ae-empty' }, 'No timeline data available.'));
      return wrap;
    }

    // Sort by join date
    authorDates.sort((a, b) => a.start.localeCompare(b.start));

    const allDates = authorDates.flatMap(d => [d.start, d.end]);
    const minDate = allDates.reduce((a, b) => a < b ? a : b);
    const maxDate = allDates.reduce((a, b) => a > b ? a : b);
    const minTime = new Date(minDate + '-01').getTime();
    const maxTime = new Date(maxDate + '-01').getTime();
    const range = maxTime - minTime || 1;

    // Date axis
    const axis = el('div', { className: 'ae-timeline-axis' });
    axis.appendChild(el('span', {}, minDate));
    axis.appendChild(el('span', {}, maxDate));
    wrap.appendChild(axis);

    // Rows
    for (let ri = 0; ri < authorDates.length; ri++) {
      const d = authorDates[ri];
      const color = getColor(d.author.name);
      const isDimmed = searchQuery && !matchesSearch(d.author, searchQuery);
      const row = el('div', { className: 'ae-timeline-row' });
      row.style.setProperty('--i', String(ri));
      if (isDimmed) row.style.opacity = '0.3';

      const timelineName = el('div', { className: 'ae-timeline-name' }, d.author.name);
      attachAuthorPopover(timelineName, d.author);
      row.appendChild(timelineName);

      const barWrap = el('div', { className: 'ae-timeline-bar-wrap' });
      const startPct = ((new Date(d.start + '-01').getTime() - minTime) / range * 100);
      const endPct = ((new Date(d.end + '-01').getTime() - minTime) / range * 100);
      const bar = el('div', {
        className: 'ae-timeline-bar',
        style: {
          left: startPct + '%',
          width: Math.max(endPct - startPct, 1) + '%',
          backgroundColor: color,
        },
      });

      // Milestones
      for (const m of d.milestones) {
        const mPct = ((new Date(m.date + '-01').getTime() - minTime) / range * 100) - startPct;
        const barWidth = endPct - startPct;
        const relPct = barWidth > 0 ? (mPct / barWidth * 100) : 0;
        const dot = el('div', {
          className: 'ae-milestone',
          style: { left: Math.min(Math.max(relPct, 2), 98) + '%' },
          title: `${m.date}: ${m.event}`,
        });
        bar.appendChild(dot);
      }

      barWrap.appendChild(bar);
      row.appendChild(barWrap);
      wrap.appendChild(row);
    }

    // Milestone legend
    const milestoneList = el('div', { className: 'ae-milestone-list' });
    for (const d of authorDates) {
      for (const m of d.milestones) {
        const item = el('div', { className: 'ae-milestone-item' });
        const color = getColor(d.author.name);
        item.appendChild(el('span', { className: 'ae-milestone-dot', style: { backgroundColor: color } }));
        item.appendChild(el('span', { className: 'ae-milestone-date' }, m.date));
        item.appendChild(el('span', { className: 'ae-milestone-name' }, d.author.name + ': '));
        item.appendChild(el('span', { className: 'ae-milestone-event' }, m.event));
        milestoneList.appendChild(item);
      }
    }
    wrap.appendChild(milestoneList);

    return wrap;
  }

  // Initial render
  rerender();

  return () => {
    _darkObserver.disconnect();
    _darkMql.removeEventListener('change', _darkMqlHandler);
    rootEl.innerHTML = '';
  };
}

export default { render };
