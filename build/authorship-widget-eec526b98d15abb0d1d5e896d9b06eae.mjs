// authorship-widget.mjs — Interactive authorship explorer for MyST anywidget
// Vanilla JS implementation (no React/Preact dependency)

// ─── Constants ──────────────────────────────────────────────────

const ALL_CREDIT_ROLES = [
  'Conceptualization', 'Methodology', 'Software', 'Validation',
  'Formal analysis', 'Investigation', 'Resources', 'Data curation',
  'Writing – original draft', 'Writing – review & editing',
  'Visualization', 'Supervision', 'Project administration', 'Funding acquisition',
];

const ROLE_ICONS = {
  'Conceptualization': '💡', 'Methodology': '🔬', 'Software': '💻',
  'Validation': '✅', 'Formal analysis': '📊', 'Investigation': '🔍',
  'Resources': '🧰', 'Data curation': '🗄️', 'Writing – original draft': '✍️',
  'Writing – review & editing': '📝', 'Visualization': '📈',
  'Supervision': '👥', 'Project administration': '📋', 'Funding acquisition': '💰',
};

const AVATAR_COLORS = [
  '#6b7280', '#4b5563', '#78716c', '#57534e',
  '#64748b', '#475569', '#71717a', '#52525b',
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

// ─── SVG helper ─────────────────────────────────────────────────

const _svgNS = 'http://www.w3.org/2000/svg';

/** Create an SVG element with attributes in one call. */
function svgEl(tag, attrs, text) {
  const e = document.createElementNS(_svgNS, tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v != null) e.setAttribute(k, String(v));
  }
  if (text != null) e.textContent = text;
  return e;
}

// ─── Avatar helpers (photo or initials fallback) ────────────────

let _avatarClipCounter = 0;

/**
 * Append a circular avatar image (or initials fallback) inside an SVG <g>.
 * If the author has an avatar_url, draws a clipped <image> on top of the
 * existing colored circle so initials show through if the image fails.
 * Otherwise draws initials text.
 */
function appendSvgAvatar(svg, g, x, y, radius, author, fontSize) {
  if (author.avatar_url) {
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = svgEl('defs');
      svg.insertBefore(defs, svg.firstChild);
    }
    const clipId = `ae-av-${_avatarClipCounter++}`;
    const clipPath = svgEl('clipPath', { id: clipId });
    clipPath.appendChild(svgEl('circle', { cx: x, cy: y, r: radius }));
    defs.appendChild(clipPath);

    const img = svgEl('image', {
      href: author.avatar_url, x: x - radius, y: y - radius,
      width: radius * 2, height: radius * 2,
      'clip-path': `url(#${clipId})`, preserveAspectRatio: 'xMidYMid slice',
    });
    img.style.pointerEvents = 'none';
    g.appendChild(img);
  } else {
    const init = svgEl('text', {
      x, y: y + 1, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      fill: '#fff', 'font-size': fontSize || (radius * 0.55),
      'font-weight': '700', 'font-family': 'Inter, system-ui, sans-serif',
    }, getInitials(author.name));
    init.style.pointerEvents = 'none';
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
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.justifyContent = 'center';
      wrapper.style.color = 'white';
      wrapper.style.fontWeight = '600';
      wrapper.style.fontSize = '14px';
    };
    wrapper.appendChild(img);
    return wrapper;
  }
  return el('div', {
    className: className,
    style: { backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600', fontSize: '14px', ...extraStyle },
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
  let searchQuery = ''; // search/filter across all views
  let cachedLayout = null; // { key, positions: [{x,y}] } — reused across ego-mode transitions
  let selectedIdx = null; // ego-centric view: index of clicked/selected author
  let selectedGroup = null; // { members: Set<idx>, label: string } — group selection from legend click

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
      const card = el('div', { className: 'ae-profile-card' });
      card.style.setProperty('--i', String(ai));
      if (isDimmed) card.style.opacity = '0.3';

      // Avatar
      const avatar = buildHtmlAvatar(author, 'ae-avatar');
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

      if (author.corresponding) {
        info.appendChild(el('p', { className: 'ae-profile-corresponding' }, '✉ Corresponding author'));
      }

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
      const th = el('th', { className: 'ae-matrix-author-th' });
      if (isDimmed) th.style.opacity = '0.3';
      th.appendChild(buildHtmlAvatar(author, 'ae-matrix-avatar'));
      const lastName = author.name.split(/\s+/).pop();
      const matrixName = el('div', { className: 'ae-matrix-author-name' }, lastName);
      attachAuthorPopover(th, author);
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
  // Per-role colors — colorblind-safe palette
  // Based on Wong (2011) Nature Methods + extended with varied lightness
  // Maximally distinct for deuteranopia/protanopia
  const ROLE_CAT = {
    'conceptualization':          { color: '#0072B2' },  // blue
    'methodology':                { color: '#56B4E9' },  // sky blue
    'software':                   { color: '#009E73' },  // bluish green
    'validation':                 { color: '#B8A000' },  // dark gold (readable with white text)
    'formal analysis':            { color: '#E69F00' },  // orange
    'investigation':              { color: '#D55E00' },  // vermillion
    'resources':                  { color: '#CC79A7' },  // reddish purple
    'data curation':              { color: '#332288' },  // indigo
    'writing – original draft':   { color: '#882255' },  // wine
    'writing – review & editing': { color: '#44AA99' },  // teal
    'visualization':              { color: '#AA4499' },  // purple
    'supervision':                { color: '#117733' },  // dark green
    'project administration':     { color: '#999933' },  // olive
    'funding acquisition':        { color: '#661100' },  // dark red
  };
  const LEVEL_OPACITY = { lead: 1.0, equal: 0.7, supporting: 0.4 };

  function getRoleCat(roleName) {
    const key = normalizeRole(roleName);
    return ROLE_CAT[key] || { color: '#94a3b8' };
  }

  function buildNetworkTab(sorted, highlightSet) {
    return buildCollabLayout(sorted, highlightSet);
  }

  function buildScatterView(sorted, highlightSet, positionFn) {
    const n = sorted.length;
    const wrap = el('div', { className: 'ae-network' });

    if (n === 0) {
      wrap.appendChild(el('p', { className: 'ae-empty' }, 'No author data available.'));
      return wrap;
    }


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

    // Node sizes — fixed radius for all nodes
    const maxRoles = Math.max(1, ...sorted.map((_, i) => authorRoles[i].length));
    const nodeRadius = isLarge ? 30 : 28;

    // Build node objects with metadata
    const nodes = sorted.map((a, i) => {
      const roles = authorRoles[i];
      const secCount = (a.section_contributions || []).length;
      const weight = roles.length + secCount;
      const radius = nodeRadius;
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
      const pad = nodeRadius + 30;
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

    // Save base positions (before any ego override) for restoration
    const basePositions = nodes.map(nd => ({ x: nd.x, y: nd.y, radius: nd.radius }));

    // ── Ego-centric layout: reposition nodes around a selected author ──
    /** Place a list of node indices evenly on a ring */
    function placeOnRing(indices, radius) {
      for (let k = 0; k < indices.length; k++) {
        const angle = (2 * Math.PI * k) / indices.length - Math.PI / 2;
        nodes[indices[k]].x = W / 2 + radius * Math.cos(angle);
        nodes[indices[k]].y = H / 2 + radius * Math.sin(angle);
      }
    }

    function applyEgoLayout() {
      if (selectedIdx === null && selectedGroup === null) {
        // Restore base positions and radii
        for (let i = 0; i < n; i++) {
          nodes[i].x = basePositions[i].x;
          nodes[i].y = basePositions[i].y;
          nodes[i].radius = basePositions[i].radius;
        }
        return;
      }

      // Group selection layout: members centered, non-members on periphery
      if (selectedGroup !== null && selectedIdx === null) {
        const CX = W / 2, CY = H / 2;
        const members = selectedGroup.members;
        for (let i = 0; i < n; i++) nodes[i].radius = basePositions[i].radius;

        // Force simulation: members attract to center, repel each other; non-members pushed out
        const posX = new Float64Array(n);
        const posY = new Float64Array(n);
        for (let i = 0; i < n; i++) {
          posX[i] = basePositions[i].x;
          posY[i] = basePositions[i].y;
        }

        const ITERATIONS = 200;
        const repulsionStrength = 3000;

        for (let iter = 0; iter < ITERATIONS; iter++) {
          const cooling = 1 - iter / ITERATIONS;
          const dt = cooling * 2;

          for (let i = 0; i < n; i++) {
            let fx = 0, fy = 0;

            // Repulsion from all other nodes
            for (let j = 0; j < n; j++) {
              if (j === i) continue;
              const dx = posX[i] - posX[j];
              const dy = posY[i] - posY[j];
              const distSq = dx * dx + dy * dy;
              const minDist = nodes[i].radius + nodes[j].radius + 40;
              const dist = Math.sqrt(distSq) || 0.1;
              const repForce = repulsionStrength / Math.max(distSq, minDist * minDist * 0.25);
              fx += (dx / dist) * repForce;
              fy += (dy / dist) * repForce;
            }

            if (members.has(i)) {
              // Members: pull toward center
              const dx = CX - posX[i];
              const dy = CY - posY[i];
              const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
              const targetDist = Math.min(W, H) * 0.15;
              const force = (dist - targetDist) * 0.015;
              fx += (dx / dist) * force;
              fy += (dy / dist) * force;
            } else {
              // Non-members: push to outer periphery
              const dx = posX[i] - CX;
              const dy = posY[i] - CY;
              const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
              const outerTargetDist = Math.min(W, H) * 0.42;
              const force = (outerTargetDist - dist) * 0.02;
              fx += (dx / dist) * force;
              fy += (dy / dist) * force;
            }

            posX[i] += fx * dt;
            posY[i] += fy * dt;
          }
        }

        for (let i = 0; i < n; i++) {
          nodes[i].x = posX[i];
          nodes[i].y = posY[i];
        }

        // Normalize: scale members to fill center
        const pad = 60;
        let eMinX = Infinity, eMinY = Infinity, eMaxX = -Infinity, eMaxY = -Infinity;
        for (let i = 0; i < n; i++) {
          if (!members.has(i)) continue;
          eMinX = Math.min(eMinX, nodes[i].x - nodes[i].radius);
          eMinY = Math.min(eMinY, nodes[i].y - nodes[i].radius);
          eMaxX = Math.max(eMaxX, nodes[i].x + nodes[i].radius);
          eMaxY = Math.max(eMaxY, nodes[i].y + nodes[i].radius);
        }
        const eDataW = (eMaxX - eMinX) || 1, eDataH = (eMaxY - eMinY) || 1;
        const eScaleX = (W - 2 * pad) / eDataW, eScaleY = (H - 2 * pad) / eDataH;
        const eScale = Math.min(eScaleX, eScaleY, 1.5); // cap scale to avoid over-zoom
        const eCX = (eMinX + eMaxX) / 2, eCY = (eMinY + eMaxY) / 2;
        for (let i = 0; i < n; i++) {
          if (!members.has(i)) continue;
          nodes[i].x = W / 2 + (nodes[i].x - eCX) * eScale;
          nodes[i].y = H / 2 + (nodes[i].y - eCY) * eScale;
        }

        // Place non-members on outer ring
        const nonMembers = [];
        for (let i = 0; i < n; i++) {
          if (!members.has(i)) nonMembers.push(i);
        }
        if (nonMembers.length > 0) {
          placeOnRing(nonMembers, Math.min(W, H) / 2 - pad * 0.5);
        }
        return;
      }

      if (selectedIdx < 0 || selectedIdx >= n) {
        for (let i = 0; i < n; i++) {
          nodes[i].x = basePositions[i].x;
          nodes[i].y = basePositions[i].y;
          nodes[i].radius = basePositions[i].radius;
        }
        return;
      }
      const CX = W / 2, CY = H / 2;
      // Compute collaboration weight between selectedIdx and each other node
      const collabWeights = new Array(n).fill(0);
      for (const link of links) {
        if (link.i === selectedIdx) collabWeights[link.j] = link.weight;
        else if (link.j === selectedIdx) collabWeights[link.i] = link.weight;
      }
      const maxCollab = Math.max(1, ...collabWeights);

      // Restore all radii first then enlarge the selected node
      for (let i = 0; i < n; i++) nodes[i].radius = basePositions[i].radius;
      nodes[selectedIdx].radius = basePositions[selectedIdx].radius * 1.5;

      // Initialize positions: selected at center, others at base positions shifted toward center
      const posX = new Float64Array(n);
      const posY = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        posX[i] = basePositions[i].x;
        posY[i] = basePositions[i].y;
      }
      posX[selectedIdx] = CX;
      posY[selectedIdx] = CY;

      // Force-directed simulation
      const ITERATIONS = 250;
      const repulsionStrength = 4000;
      const attractionStrength = 0.012;
      const centerGravity = 0.001; // gentle pull toward center for unconnected nodes
      // For small teams, increase spacing to prevent label/circle overlap
      const connectedCount = collabWeights.filter(w => w > 0).length;
      const smallTeamBoost = connectedCount < 15 ? 40 : 0;

      for (let iter = 0; iter < ITERATIONS; iter++) {
        const cooling = 1 - iter / ITERATIONS; // reduce forces over time
        const dt = cooling * 2;

        for (let i = 0; i < n; i++) {
          if (i === selectedIdx) continue;
          let fx = 0, fy = 0;

          // Repulsion from all other nodes (include label height in spacing)
          for (let j = 0; j < n; j++) {
            if (j === i) continue;
            const dx = posX[i] - posX[j];
            const dy = posY[i] - posY[j];
            const distSq = dx * dx + dy * dy;
            const minDist = nodes[i].radius + nodes[j].radius + 80 + smallTeamBoost;
            const dist = Math.sqrt(distSq) || 0.1;
            // Stronger repulsion when close
            const repForce = repulsionStrength / Math.max(distSq, minDist * minDist * 0.25);
            fx += (dx / dist) * repForce;
            fy += (dy / dist) * repForce;
          }

          // Attraction toward selected person (proportional to collaboration)
          const w = collabWeights[i] / maxCollab;
          if (w > 0) {
            const dx = CX - posX[i];
            const dy = CY - posY[i];
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
            // Target distance: closer for stronger collaborators but with generous minimum
            const targetDist = (nodes[selectedIdx].radius + nodes[i].radius + 80 + smallTeamBoost) + (1 - w * w) * 180;
            const force = (dist - targetDist) * attractionStrength * (1 + w);
            fx += (dx / dist) * force;
          } else {
            // Unconnected: push them to the outer periphery
            const dx = posX[i] - CX;
            const dy = posY[i] - CY;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
            const outerTargetDist = Math.min(W, H) * 0.42;
            const force = (outerTargetDist - dist) * 0.02;
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }

          posX[i] += fx * dt;
          posY[i] += fy * dt;
        }
      }

      // Apply final positions
      for (let i = 0; i < n; i++) {
        nodes[i].x = posX[i];
        nodes[i].y = posY[i];
      }

      // Normalize: scale only connected nodes to fill the SVG canvas with padding
      const pad = 60;
      let eMinX = Infinity, eMinY = Infinity, eMaxX = -Infinity, eMaxY = -Infinity;
      const labelExtra = isLarge ? 34 : 36; // space for name label + shared-roles text below node
      for (let i = 0; i < n; i++) {
        if (i !== selectedIdx && collabWeights[i] === 0) continue; // skip unconnected
        eMinX = Math.min(eMinX, nodes[i].x - nodes[i].radius);
        eMinY = Math.min(eMinY, nodes[i].y - nodes[i].radius);
        eMaxX = Math.max(eMaxX, nodes[i].x + nodes[i].radius);
        eMaxY = Math.max(eMaxY, nodes[i].y + nodes[i].radius + labelExtra);
      }
      const eDataW = (eMaxX - eMinX) || 1, eDataH = (eMaxY - eMinY) || 1;
      const eScaleX = (W - 2 * pad) / eDataW, eScaleY = (H - 2 * pad) / eDataH;
      const eScale = Math.min(eScaleX, eScaleY, 1.5); // cap scale to avoid over-zoom causing overlap
      // Scale connected nodes to fill center area
      const eCX = (eMinX + eMaxX) / 2, eCY = (eMinY + eMaxY) / 2;
      for (let i = 0; i < n; i++) {
        if (i !== selectedIdx && collabWeights[i] === 0) continue;
        nodes[i].x = W / 2 + (nodes[i].x - eCX) * eScale;
        nodes[i].y = H / 2 + (nodes[i].y - eCY) * eScale;
      }

      // Place unconnected nodes on an outer ring beyond the connected cluster
      const unconnected = [];
      for (let i = 0; i < n; i++) {
        if (i !== selectedIdx && collabWeights[i] === 0) unconnected.push(i);
      }
      if (unconnected.length > 0) {
        placeOnRing(unconnected, Math.min(W, H) / 2 - pad * 0.5);
      }
    }

    // Apply ego layout if selected on initial build
    applyEgoLayout();

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

    /** Restore node opacities based on current selection state */
    function restoreNodeOpacities(svgRoot) {
      if (!svgRoot) return;
      svgRoot.querySelectorAll('g[data-node-idx]').forEach(gEl => {
        const gIdx = parseInt(gEl.getAttribute('data-node-idx'));
        let opacity = 1;
        if (selectedIdx !== null && gIdx !== selectedIdx) {
          const w = links.find(l => (l.i === selectedIdx && l.j === gIdx) || (l.j === selectedIdx && l.i === gIdx));
          opacity = w ? 0.5 + 0.5 * (w.weight / maxWeight) : 0.25;
        }
        if (selectedGroup && selectedIdx === null) {
          opacity = selectedGroup.members.has(gIdx) ? 1 : 0.15;
        }
        gEl.style.opacity = String(opacity);
      });
      // Restore edge opacities
      svgRoot.querySelectorAll('.ae-edge-path').forEach(edge => {
        if (selectedGroup && selectedIdx === null) {
          const ei = parseInt(edge.getAttribute('data-edge-i'));
          const ej = parseInt(edge.getAttribute('data-edge-j'));
          edge.style.opacity = (selectedGroup.members.has(ei) && selectedGroup.members.has(ej)) ? '' : '0.05';
        } else {
          edge.style.opacity = '';
        }
      });
    }

    /** Highlight hovered node and its direct connections, dim others */
    function highlightConnectedNodes(svgRoot, idx) {
      if (!svgRoot) return;
      const connectedSet = new Set([idx]);
      for (const link of links) {
        if (link.i === idx) connectedSet.add(link.j);
        if (link.j === idx) connectedSet.add(link.i);
      }
      svgRoot.querySelectorAll('g[data-node-idx]').forEach(gEl => {
        const gIdx = parseInt(gEl.getAttribute('data-node-idx'));
        if (gIdx === idx) gEl.style.opacity = '1';
        else if (connectedSet.has(gIdx)) gEl.style.opacity = '0.85';
        else gEl.style.opacity = '0.2';
      });
      // Dim edges not connected to the hovered node
      svgRoot.querySelectorAll('.ae-edge-path').forEach(edge => {
        const ei = parseInt(edge.getAttribute('data-edge-i'));
        const ej = parseInt(edge.getAttribute('data-edge-j'));
        edge.style.opacity = (ei === idx || ej === idx) ? '' : '0.05';
      });
    }

    function renderSVG() {
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'ae-network-svg', preserveAspectRatio: 'xMidYMid meet' });
      svg.style.display = 'block';

      // Background click to deselect
      if (selectedIdx !== null || selectedGroup !== null) {
        const bg = svgEl('rect', { x: 0, y: 0, width: W, height: H, fill: 'transparent' });
        bg.style.cursor = 'pointer';
        bg.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); });
        bg.addEventListener('pointerup', () => { selectedIdx = null; selectedGroup = null; rerenderView(); updateLegendStyles(); });
        svg.appendChild(bg);
      }

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
        // In ego mode, only show edges involving the selected person's collaborators
        if (selectedIdx !== null) {
          const selConnected = (idx) => idx === selectedIdx ||
            links.some(l => (l.i === selectedIdx && l.j === idx) || (l.j === selectedIdx && l.i === idx));
          if (!selConnected(i) || !selConnected(j)) continue;
        }
        const s = nodes[i], t = nodes[j];
        // Filter to only highlighted strands when hovering
        const visibleEdges = isHovering && highlightedEdges
          ? edges.filter(e => highlightedEdges.has(e.edgeIdx))
          : edges;
        if (visibleEdges.length === 0) continue;
        let baseOpacity = !isHovering ? 0.45 : 0.75;
        // Dim edges not between group members
        if (selectedGroup && selectedIdx === null) {
          baseOpacity = (selectedGroup.members.has(i) && selectedGroup.members.has(j)) ? 0.6 : 0.05;
        }

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
          const path = svgEl('path', {
            d: `M${sx + ox},${sy + oy} L${tx + ox},${ty + oy}`,
            fill: 'none', stroke: e.color, 'stroke-width': strandW,
            'stroke-opacity': baseOpacity, 'stroke-linecap': 'round',
            'vector-effect': 'non-scaling-stroke',
            class: 'ae-edge-path', 'data-edge-i': i, 'data-edge-j': j,
          });
          path.appendChild(svgEl('title', null, `${sorted[i].name} ↔ ${sorted[j].name}\n${e.role} (${e.level})`));
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
        const isSelected = selectedIdx === idx;
        const isConnected = isHovering && highlightedNodes.has(idx);
        const isDim = isHovering && !isHovered && !isConnected;
        const isSearchDim = highlightSet && !highlightSet.has(idx);
        // In ego mode, dim unconnected nodes
        let egoOpacity = 1;
        if (selectedIdx !== null && !isSelected) {
          const w = links.find(l => (l.i === selectedIdx && l.j === idx) || (l.j === selectedIdx && l.i === idx));
          egoOpacity = w ? 0.5 + 0.5 * (w.weight / maxWeight) : 0.25;
        }
        // Group selection opacity
        let grpOpacity = egoOpacity;
        if (selectedGroup && selectedIdx === null) {
          grpOpacity = selectedGroup.members.has(idx) ? 1 : 0.15;
        }
        const groupOpacity = isDim ? 0.15 : isSearchDim ? 0.25 : grpOpacity;

        const g = svgEl('g', { 'data-node-idx': idx });
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
          g.appendChild(svgEl('path', {
            d: `M ${arcS.x} ${arcS.y} A ${ringR} ${ringR} 0 ${largeArc} 1 ${arcE.x} ${arcE.y}`,
            stroke: roles[ri].color, 'stroke-width': 4, 'stroke-linecap': 'round',
            fill: 'none', opacity: roles[ri].opacity, 'vector-effect': 'non-scaling-stroke',
          }));
        }

        // Shadow + main circle
        g.appendChild(svgEl('circle', { cx: nd.x, cy: nd.y + 2, r: nd.radius, fill: 'black', opacity: 0.08 }));
        g.appendChild(svgEl('circle', {
          cx: nd.x, cy: nd.y, r: nd.radius, fill: nd.color,
          stroke: isDark ? '#374151' : 'white', 'stroke-width': 3, 'vector-effect': 'non-scaling-stroke',
        }));

        if (isHovered) {
          g.appendChild(svgEl('circle', {
            cx: nd.x, cy: nd.y, r: nd.radius + 2, fill: 'none',
            stroke: nd.color, 'stroke-width': 2, opacity: 0.4, 'vector-effect': 'non-scaling-stroke',
          }));
        }

        if (isSelected) {
          g.appendChild(svgEl('circle', {
            cx: nd.x, cy: nd.y, r: nd.radius + 6, fill: 'none',
            stroke: '#4338ca', 'stroke-width': 3, 'stroke-dasharray': '6 3',
            opacity: 0.8, 'vector-effect': 'non-scaling-stroke',
          }));
        }

        appendSvgAvatar(svg, g, nd.x, nd.y, nd.radius, sorted[idx], nd.radius * 0.55);

        const isSearchMatch = highlightSet && highlightSet.has(idx);
        const labelFill = isSelected ? (isDark ? '#a5b4fc' : '#4338ca') : isHovered ? (isDark ? '#e2e8f0' : '#1e3a5f') : isSearchMatch ? (isDark ? '#a5b4fc' : '#4338ca') : (isDark ? '#e2e8f0' : '#1f2937');
        const label = svgEl('text', {
          x: nd.x, y: nd.y + nd.radius + (isLarge ? 16 : 18), 'text-anchor': 'middle',
          fill: labelFill, 'font-size': isSelected ? (isLarge ? 22 : 17) : isLarge ? 19 : 15,
          'font-weight': isSelected || isHovered || isSearchMatch ? 700 : 500,
          'font-family': 'Inter, system-ui, sans-serif',
        }, isSelected ? nd.name : nd.lastName);
        label.style.pointerEvents = 'none';
        g.appendChild(label);

        // In ego-centric mode, show collaboration score under non-selected nodes
        if (selectedIdx !== null && !isSelected) {
          const collabLink = links.find(l => (l.i === selectedIdx && l.j === idx) || (l.j === selectedIdx && l.i === idx));
          const score = collabLink ? collabLink.sharedRoles.length : 0;
          if (score > 0) {
            const scoreLabel = svgEl('text', {
              x: nd.x, y: nd.y + nd.radius + (isLarge ? 30 : 32), 'text-anchor': 'middle',
              fill: isDark ? '#9ca3af' : '#6b7280', 'font-size': isLarge ? 14 : 11,
              'font-weight': 400, 'font-family': 'Inter, system-ui, sans-serif',
            }, `${score} shared role${score > 1 ? 's' : ''}`);
            scoreLabel.style.pointerEvents = 'none';
            g.appendChild(scoreLabel);
          }
        }

        g.addEventListener('mouseenter', () => {
          hoveredIdx = idx;
          highlightConnectedNodes(g.closest('svg'), idx);
          updateInfoCard();
        });
        g.addEventListener('mouseleave', () => {
          hoveredIdx = null;
          restoreNodeOpacities(g.closest('svg'));
          updateInfoCard();
        });
        g.addEventListener('pointerdown', (e) => {
          e.stopPropagation(); // prevent pan from starting when clicking a node
          e.preventDefault();  // prevent subsequent mousedown from firing
          g._clickStartX = e.clientX;
          g._clickStartY = e.clientY;
        });
        g.addEventListener('pointerup', (e) => {
          const dx = e.clientX - (g._clickStartX || 0);
          const dy = e.clientY - (g._clickStartY || 0);
          if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
            e.stopPropagation();
            console.log('[AuthorshipWidget] Node clicked:', nd.name, 'selectedIdx:', selectedIdx, '→', selectedIdx === idx ? null : idx);
            if (selectedIdx === idx) {
              selectedIdx = null;
            } else {
              selectedIdx = idx;
              selectedGroup = null;
            }
            rerenderView();
            updateLegendStyles();
          }
        });
        g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
        g.setAttribute('aria-label', nd.name);
        g.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); hoveredIdx = hoveredIdx === idx ? null : idx; rerenderView();
          }
        });
        g.addEventListener('focus', () => {
          hoveredIdx = idx;
          highlightConnectedNodes(g.closest('svg'), idx);
        });
        g.addEventListener('blur', () => {
          hoveredIdx = null;
          restoreNodeOpacities(g.closest('svg'));
        });

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

    // Update info card on hover (called from mouseenter/mouseleave)
    function updateInfoCard() {
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

    // Zoom/pan — start with tight-fit viewBox
    let vbX = initVbX, vbY = initVbY, vbW = initVbW, vbH = initVbH;
    let isPanning = false, hasPanned = false, panStartX = 0, panStartY = 0, panStartVbX = 0, panStartVbY = 0;
    const PAN_THRESHOLD = 4; // pixels of movement before panning starts
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
      isPanning = true; hasPanned = false;
      panStartX = e.clientX; panStartY = e.clientY;
      panStartVbX = vbX; panStartVbY = vbY;
    });
    graphWrap.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      const dx = e.clientX - panStartX, dy = e.clientY - panStartY;
      if (!hasPanned && Math.abs(dx) < PAN_THRESHOLD && Math.abs(dy) < PAN_THRESHOLD) return;
      hasPanned = true;
      graphWrap.style.cursor = 'grabbing';
      const rect = graphWrap.getBoundingClientRect();
      vbX = panStartVbX - dx * (vbW / rect.width);
      vbY = panStartVbY - dy * (vbH / rect.height);
      applyViewBox();
    });
    const stopPan = () => { isPanning = false; graphWrap.style.cursor = 'grab'; };
    graphWrap.addEventListener('mouseup', stopPan);
    graphWrap.addEventListener('mouseleave', stopPan);

    // Touch support for mobile: single-finger pan, two-finger pinch-to-zoom
    let touchStartDist = 0, touchStartVbW = 0, touchStartVbH = 0;
    let touchStartMidX = 0, touchStartMidY = 0;
    let touchNodeTap = false; // track if touch started on an interactive node
    graphWrap.addEventListener('touchstart', (e) => {
      // Check if touch started on an author node (let pointer events handle it)
      const target = e.target.closest('[role="button"]');
      touchNodeTap = !!target;
      if (e.touches.length === 1) {
        isPanning = true; hasPanned = false;
        panStartX = e.touches[0].clientX; panStartY = e.touches[0].clientY;
        panStartVbX = vbX; panStartVbY = vbY;
      } else if (e.touches.length === 2) {
        isPanning = false;
        const t0 = e.touches[0], t1 = e.touches[1];
        touchStartDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        touchStartVbW = vbW; touchStartVbH = vbH;
        const rect = graphWrap.getBoundingClientRect();
        touchStartMidX = ((t0.clientX + t1.clientX) / 2 - rect.left) / rect.width;
        touchStartMidY = ((t0.clientY + t1.clientY) / 2 - rect.top) / rect.height;
        panStartVbX = vbX; panStartVbY = vbY;
      }
    }, { passive: true });
    graphWrap.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && isPanning) {
        const dx = e.touches[0].clientX - panStartX, dy = e.touches[0].clientY - panStartY;
        if (!hasPanned && Math.abs(dx) < PAN_THRESHOLD && Math.abs(dy) < PAN_THRESHOLD) return;
        hasPanned = true;
        e.preventDefault();
        const rect = graphWrap.getBoundingClientRect();
        vbX = panStartVbX - dx * (vbW / rect.width);
        vbY = panStartVbY - dy * (vbH / rect.height);
        applyViewBox();
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const t0 = e.touches[0], t1 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const scale = touchStartDist / dist;
        const newW = Math.max(initVbW * 0.2, Math.min(initVbW * 3, touchStartVbW * scale));
        const newH = Math.max(initVbH * 0.2, Math.min(initVbH * 3, touchStartVbH * scale));
        vbX = panStartVbX + (touchStartVbW - newW) * touchStartMidX;
        vbY = panStartVbY + (touchStartVbH - newH) * touchStartMidY;
        vbW = newW; vbH = newH;
        applyViewBox();
      }
    }, { passive: false });
    graphWrap.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        // If didn't pan and not on a node, treat as background tap → deselect
        if (!hasPanned && !touchNodeTap && (selectedIdx !== null || selectedGroup !== null)) {
          selectedIdx = null; selectedGroup = null;
          rerenderView(); updateLegendStyles();
        }
        isPanning = false;
        touchNodeTap = false;
      }
    }, { passive: true });

    // Zoom controls
    const zoomControls = el('div', { className: 'ae-zoom-controls' });
    zoomControls.appendChild(el('button', { className: 'ae-zoom-btn',
      onClick: () => { const nW = Math.max(initVbW*0.2,vbW*0.7), nH = Math.max(initVbH*0.2,vbH*0.7); vbX+=(vbW-nW)/2; vbY+=(vbH-nH)/2; vbW=nW; vbH=nH; applyViewBox(); }, title: 'Zoom in' }, '+'));
    zoomControls.appendChild(el('button', { className: 'ae-zoom-btn',
      onClick: () => { const nW = Math.min(initVbW*3,vbW*1.4), nH = Math.min(initVbH*3,vbH*1.4); vbX+=(vbW-nW)/2; vbY+=(vbH-nH)/2; vbW=nW; vbH=nH; applyViewBox(); }, title: 'Zoom out' }, '−'));
    zoomControls.appendChild(el('button', { className: 'ae-zoom-btn',
      onClick: () => { vbX=initVbX; vbY=initVbY; vbW=initVbW; vbH=initVbH; applyViewBox(); }, title: 'Reset zoom' }, '⟲'));
    graphWrap.appendChild(zoomControls);

    let lastSelectedIdx = selectedIdx; // track if selection changed

    let animFrameId = null;

    function rerenderView() {
      // Capture old positions before layout change
      const oldPositions = nodes.map(nd => ({ x: nd.x, y: nd.y }));

      // Reapply ego layout (or restore base positions) based on current selectedIdx
      applyEgoLayout();

      // Refit viewBox when selection state changes
      if (selectedIdx !== lastSelectedIdx) {
        lastSelectedIdx = selectedIdx;
        const labelPadR = 30;
        let tMinXR = Infinity, tMinYR = Infinity, tMaxXR = -Infinity, tMaxYR = -Infinity;
        for (const nd of nodes) {
          tMinXR = Math.min(tMinXR, nd.x - nd.radius - 10);
          tMinYR = Math.min(tMinYR, nd.y - nd.radius - 10);
          tMaxXR = Math.max(tMaxXR, nd.x + nd.radius + 10);
          tMaxYR = Math.max(tMaxYR, nd.y + nd.radius + labelPadR);
        }
        const fitWR = tMaxXR - tMinXR, fitHR = tMaxYR - tMinYR;
        const fitMarginR = 20;
        vbX = tMinXR - fitMarginR;
        vbY = tMinYR - fitMarginR;
        vbW = fitWR + 2 * fitMarginR;
        vbH = fitHR + 2 * fitMarginR;
      }

      const oldSvg = graphWrap.querySelector('.ae-network-svg');
      const newSvg = renderSVG();
      newSvg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
      if (oldSvg && oldSvg.parentNode) oldSvg.replaceWith(newSvg);
      else if (!oldSvg) graphWrap.appendChild(newSvg);

      // Animate nodes from old positions to new positions
      const ANIM_DURATION = 600; // ms
      const nodeGs = newSvg.querySelectorAll('g[data-node-idx]');
      const edgePaths = newSvg.querySelectorAll('.ae-edge-path');
      const hasMovement = oldPositions.some((op, i) =>
        Math.abs(op.x - nodes[i].x) > 1 || Math.abs(op.y - nodes[i].y) > 1
      );
      if (hasMovement && nodeGs.length > 0) {
        // Apply initial offset transforms (visually at old positions)
        nodeGs.forEach(gEl => {
          const idx = parseInt(gEl.getAttribute('data-node-idx'));
          const dx = oldPositions[idx].x - nodes[idx].x;
          const dy = oldPositions[idx].y - nodes[idx].y;
          gEl.setAttribute('transform', `translate(${dx}, ${dy})`);
        });
        // Hide edges during transition, fade them in at the end
        edgePaths.forEach(p => {
          p._targetOpacity = p.getAttribute('stroke-opacity') || '0.45';
          p.setAttribute('stroke-opacity', '0');
        });
        // Animate to final positions
        if (animFrameId) cancelAnimationFrame(animFrameId);
        const startTime = performance.now();
        function animateStep(now) {
          const elapsed = now - startTime;
          const t = Math.min(1, elapsed / ANIM_DURATION);
          // Ease-out cubic
          const ease = 1 - Math.pow(1 - t, 3);
          nodeGs.forEach(gEl => {
            const idx = parseInt(gEl.getAttribute('data-node-idx'));
            const dx = oldPositions[idx].x - nodes[idx].x;
            const dy = oldPositions[idx].y - nodes[idx].y;
            const cx = dx * (1 - ease);
            const cy = dy * (1 - ease);
            gEl.setAttribute('transform', `translate(${cx}, ${cy})`);
          });
          // Fade edges in during the second half of animation
          const edgeT = Math.max(0, (t - 0.4) / 0.6);
          edgePaths.forEach(p => {
            p.setAttribute('stroke-opacity', String(parseFloat(p._targetOpacity) * edgeT));
          });
          if (t < 1) {
            animFrameId = requestAnimationFrame(animateStep);
          } else {
            nodeGs.forEach(gEl => gEl.removeAttribute('transform'));
            edgePaths.forEach(p => p.setAttribute('stroke-opacity', p._targetOpacity));
            animFrameId = null;
          }
        }
        animFrameId = requestAnimationFrame(animateStep);
      }

      // "Show All" button
      const oldBack = graphWrap.querySelector('.ae-ego-back-btn');
      if ((selectedIdx !== null && selectedIdx >= 0 && selectedIdx < n) || selectedGroup !== null) {
        if (!oldBack) {
          const backBtn = el('button', {
            className: 'ae-ego-back-btn',
            onClick: () => { selectedIdx = null; selectedGroup = null; rerenderView(); updateLegendStyles(); },
            title: 'Return to full network view',
          }, '← Show All');
          graphWrap.appendChild(backBtn);
        }
      } else {
        if (oldBack) oldBack.remove();
      }

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

    // Helper: dim/restore nodes AND edges for a set of member indices
    function legendHoverEnter(members) {
      const svgEl = graphWrap.querySelector('svg');
      if (!svgEl) return;
      const allGs = svgEl.querySelectorAll('g[data-node-idx]');
      allGs.forEach(gEl => {
        const gIdx = parseInt(gEl.getAttribute('data-node-idx'));
        gEl.style.opacity = members.has(gIdx) ? '1' : '0.15';
      });
      const allEdges = svgEl.querySelectorAll('.ae-edge-path');
      allEdges.forEach(edge => {
        const ei = parseInt(edge.getAttribute('data-edge-i'));
        const ej = parseInt(edge.getAttribute('data-edge-j'));
        edge.style.opacity = (members.has(ei) && members.has(ej)) ? '' : '0.05';
      });
    }
    function legendHoverLeave() {
      const svgRoot = graphWrap.querySelector('svg');
      if (!svgRoot) return;
      restoreNodeOpacities(svgRoot);
      const allEdges = svgRoot.querySelectorAll('.ae-edge-path');
      allEdges.forEach(edge => {
        if (selectedGroup && selectedIdx === null) {
          const ei = parseInt(edge.getAttribute('data-edge-i'));
          const ej = parseInt(edge.getAttribute('data-edge-j'));
          edge.style.opacity = (selectedGroup.members.has(ei) && selectedGroup.members.has(ej)) ? '' : '0.05';
        } else {
          edge.style.opacity = '';
        }
      });
    }

    // Track all legend items for selection styling
    const legendItems = []; // { element, label }
    function updateLegendStyles() {
      for (const li of legendItems) {
        if (selectedGroup) {
          if (li.label === selectedGroup.label) {
            li.element.style.opacity = '1';
            li.element.style.fontWeight = '700';
          } else {
            li.element.style.opacity = '0.4';
            li.element.style.fontWeight = '';
          }
        } else {
          li.element.style.opacity = '1';
          li.element.style.fontWeight = '';
        }
      }
    }

    // Legend — Roles
    const legend = el('div', { className: 'ae-network-legend ae-role-legend' });
    legend.appendChild(el('div', { className: 'ae-legend-heading' }, 'Roles'));
    for (const role of ALL_CREDIT_ROLES) {
      const rc = getRoleCat(role);
      const item = el('div', { className: 'ae-legend-item', style: { cursor: 'pointer' } },
        el('span', { className: 'ae-legend-dot', style: { backgroundColor: rc.color } }),
        el('span', { className: 'ae-legend-label' }, role.replace('Writing – ', 'W: ').replace('Formal a', 'A')),
      );
      item.addEventListener('mouseenter', () => { hoveredRole = role; rerenderView(); });
      item.addEventListener('mouseleave', () => { hoveredRole = null; rerenderView(); });
      item.addEventListener('click', () => {
        const normalHovered = normalizeRole(role);
        const members = new Set();
        for (let idx = 0; idx < n; idx++) {
          const levels = sorted[idx].credit_levels || [];
          if (levels.some(cl => normalizeRole(cl.role) === normalHovered)) members.add(idx);
        }
        if (selectedGroup && selectedGroup.label === role) { selectedGroup = null; }
        else { selectedGroup = { members, label: role }; selectedIdx = null; }
        rerenderView();
        updateLegendStyles();
      });
      legendItems.push({ element: item, label: role });
      legend.appendChild(item);
    }
    wrap.appendChild(legend);

    // Legend — Institutions
    function iKey(aff) { return typeof aff === 'string' ? aff : (aff.name || aff.id || JSON.stringify(aff)); }
    function iName(aff) { return typeof aff === 'string' ? aff : (aff.name || aff.id || '?'); }
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
    const instEntries = [...instMap.entries()].filter(([, v]) => v.members.size > 0);
    if (instEntries.length > 0) {
      const instLegend = el('div', { className: 'ae-network-legend ae-inst-legend' });
      instLegend.appendChild(el('div', { className: 'ae-legend-heading' }, 'Institutions'));
      instEntries.forEach(([, inst]) => {
        const item = el('div', { className: 'ae-legend-item', style: { cursor: 'pointer' } },
          el('span', { className: 'ae-legend-label' }, inst.name),
        );
        item.addEventListener('mouseenter', () => legendHoverEnter(inst.members));
        item.addEventListener('mouseleave', () => legendHoverLeave());
        item.addEventListener('click', () => {
          if (selectedGroup && selectedGroup.label === inst.name) { selectedGroup = null; }
          else { selectedGroup = { members: inst.members, label: inst.name }; selectedIdx = null; }
          rerenderView();
          updateLegendStyles();
        });
        legendItems.push({ element: item, label: inst.name });
        instLegend.appendChild(item);
      });
      wrap.appendChild(instLegend);
    }

    // Legend — Sections & Figures
    const secMap = new Map();
    for (let i = 0; i < n; i++) {
      const secs = sorted[i].section_contributions || [];
      for (const sc of secs) {
        if (!secMap.has(sc.section)) secMap.set(sc.section, new Set());
        secMap.get(sc.section).add(i);
      }
    }
    const figMap = new Map();
    for (let i = 0; i < n; i++) {
      const figs = sorted[i].figure_contributions || [];
      for (const fc of figs) {
        if (!figMap.has(fc.figure)) figMap.set(fc.figure, new Set());
        figMap.get(fc.figure).add(i);
      }
    }
    const secEntries = [...secMap.entries()].filter(([, v]) => v.size > 0);
    const figEntries = [...figMap.entries()].filter(([, v]) => v.size > 0);
    if (secEntries.length > 0 || figEntries.length > 0) {
      const secLegend = el('div', { className: 'ae-network-legend ae-sec-legend' });
      secLegend.appendChild(el('div', { className: 'ae-legend-heading' }, 'Sections & Figures'));
      const buildSecItem = (label, members) => {
        const item = el('div', { className: 'ae-legend-item', style: { cursor: 'pointer' } },
          el('span', { className: 'ae-legend-label' }, label),
        );
        item.addEventListener('mouseenter', () => legendHoverEnter(members));
        item.addEventListener('mouseleave', () => legendHoverLeave());
        item.addEventListener('click', () => {
          if (selectedGroup && selectedGroup.label === label) { selectedGroup = null; }
          else { selectedGroup = { members, label }; selectedIdx = null; }
          rerenderView();
          updateLegendStyles();
        });
        legendItems.push({ element: item, label });
        return item;
      };
      secEntries.forEach(([secId, members]) => {
        secLegend.appendChild(buildSecItem(sectionLabel(secId), members));
      });
      figEntries.forEach(([figId, members]) => {
        const label = '📊 ' + figId.replace(/^fig-/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        secLegend.appendChild(buildSecItem(label, members));
      });
      wrap.appendChild(secLegend);
    }

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
