/**
 * authorship-plugin.mjs — MyST plugin for authorship display
 *
 * Provides two features:
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. {authorship-explorer} DIRECTIVE
 * ─────────────────────────────────────────────────────────────────────────────
 * A full interactive contributor explorer widget, intended for intro.md or
 * similar overview pages. Renders a searchable/filterable table of all
 * contributors with roles, affiliations, and links.
 *
 * Usage in a MyST markdown/notebook file:
 *
 *   ```{authorship-explorer}
 *   :authors: ./authors.yml
 *   ```
 *
 * Options:
 *   :authors:      Path to the primary authors YAML file (default: ./authors.yml)
 *   :authors-alt:  Path to an alternate YAML file (shown via a toggle button)
 *   :alt-label:    Label for the alternate dataset button
 *   :authors-alt2: Path to a second alternate YAML file
 *   :alt2-label:   Label for the second alternate dataset button
 *   :height:       Widget height in pixels (default: 600)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. PER-NOTEBOOK AUTHOR BYLINE (automatic)
 * ─────────────────────────────────────────────────────────────────────────────
 * Automatically injects a compact two-column author byline (matching the
 * native MyST page-header byline style) at the top of any notebook that has
 * author IDs in its notebook-level metadata. The byline is rendered via
 * byline-widget.mjs (an anywidget) at runtime.
 *
 * To assign authors to a notebook, add to the notebook's top-level metadata
 * (the "metadata" key in the .ipynb JSON, not a cell):
 *
 *   "metadata": {
 *     "authors": [
 *       { "id": "author-jane-smith" },
 *       { "id": "author-john-doe" }
 *     ]
 *   }
 *
 * IDs must match the "id" field of a contributor in authors.yml. The plugin
 * resolves the full contributor record (name, orcid, affiliations, roles, etc.)
 * from authors.yml at build time.
 *
 * OPT-OUT OPTIONS:
 *   Global  — set `settings.inject_byline: false` in authors.yml to disable
 *             auto-injection for all notebooks at once.
 *   Per-notebook — add `"inject_byline": false` to a notebook's top-level
 *             metadata block to skip injection for that notebook only.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AUTHORS.YML STRUCTURE
 * ─────────────────────────────────────────────────────────────────────────────
 * version: 1
 * settings:
 *   inject_byline: true          # global toggle for per-notebook bylines
 * project:
 *   contributors:
 *     - id: author-jane-smith
 *       name: Jane Smith
 *       orcid: 0000-0000-0000-0000
 *       email: jane@example.org
 *       affiliations:
 *         - name: Some University
 *       roles:
 *         - Conceptualization
 *         - Software
 *       social_links:
 *         - platform: github
 *           url: https://github.com/janesmith
 *
 * Contributors and affiliations in myst.yml are synced from authors.yml
 * (needed for native MyST frontmatter features like citation generation).
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __pluginDir = dirname(fileURLToPath(import.meta.url));

// Emitted at most once per build to avoid log spam
let _doubleAuthorWarned = false;

// Module-level helper: resolve affiliation ID strings to full objects
function resolveAffiliations(data) {
  const contribs = data?.project?.contributors || data?.contributors || [];
  const affDefs = data?.project?.affiliations || data?.affiliations || [];
  const affMap = Object.fromEntries(affDefs.map(a => [a.id, a]));
  return contribs.map(c => {
    if (!c.affiliations) return c;
    return {
      ...c,
      affiliations: c.affiliations.map(aff =>
        typeof aff === 'string' ? (affMap[aff] || { id: aff, name: aff }) : aff
      ),
    };
  });
}

// Module-level helper: load authors.yml → map of id → contributor
function loadContributorsByIdFromYml(yamlPath) {
  const { parse } = require('yaml');
  const fullData = parse(readFileSync(yamlPath, 'utf-8'));
  const contributors = resolveAffiliations(fullData);
  return Object.fromEntries(contributors.filter(c => c.id).map(c => [c.id, c]));
}

const authorshipDirective = {
  name: 'authorship-explorer',
  doc: 'Renders an interactive authorship contribution explorer widget.',
  options: {
    authors: {
      type: String,
      doc: 'Path to authors YAML file (default: ./authors.yml)',
    },
    'authors-alt': {
      type: String,
      doc: 'Path to alternate authors YAML file for toggle (e.g. ./authors-real.yml)',
    },
    'alt-label': {
      type: String,
      doc: 'Label for the alternate dataset (default: "Real contributors")',
    },
    'authors-alt2': {
      type: String,
      doc: 'Path to second alternate authors YAML file',
    },
    'alt2-label': {
      type: String,
      doc: 'Label for the second alternate dataset',
    },
    height: {
      type: String,
      doc: 'Widget height, e.g. "800px"',
    },
  },
  run(data) {
    return [
      {
        type: 'authorship-explorer',
        authorsPath: data.options?.authors || './authors.yml',
        authorsAltPath: data.options?.['authors-alt'] || null,
        altLabel: data.options?.['alt-label'] || 'Real contributors',
        authorsAlt2Path: data.options?.['authors-alt2'] || null,
        alt2Label: data.options?.['alt2-label'] || 'Large team',
        height: data.options?.height || '800px',
      },
    ];
  },
};

const authorshipTransform = {
  name: 'authorship-data-loader',
  stage: 'document',
  plugin: (opts, utils) => (tree, vfile) => {
    // Build section ID → heading text map from the document AST
    const sectionLabels = {};
    function collectHeadings(n) {
      if (!n) return;
      if (n.type === 'heading' && n.identifier) {
        const text = (n.children || [])
          .filter(c => c.type === 'text')
          .map(c => c.value)
          .join('');
        if (text) sectionLabels[n.identifier] = text;
      }
      if (n.children) for (const child of n.children) collectHeadings(child);
    }
    collectHeadings(tree);

    function transform(node) {
      if (!node) return;

      if (node.type === 'authorship-explorer') {
        const docDir = vfile?.path ? dirname(vfile.path) : process.cwd();
        const yamlPath = resolve(docDir, node.authorsPath || './authors.yml');

        try {
          const raw = readFileSync(yamlPath, 'utf-8');
          const { parse } = require('yaml');
          const fullData = parse(raw);

          const contributors = resolveAffiliations(fullData);

          // Load alternate authors if specified
          let altContributors = null;
          let altLabel = node.altLabel || 'Real contributors';
          if (node.authorsAltPath) {
            try {
              const altPath = resolve(docDir, node.authorsAltPath);
              const altRaw = readFileSync(altPath, 'utf-8');
              const altData = parse(altRaw);
              altContributors = resolveAffiliations(altData);
            } catch (altErr) {
              console.warn(`authorship-plugin: Alt authors error: ${altErr.message}`);
            }
          }

          // Load second alternate authors if specified
          let alt2Contributors = null;
          let alt2Label = node.alt2Label || 'Large team';
          if (node.authorsAlt2Path) {
            try {
              const alt2Path = resolve(docDir, node.authorsAlt2Path);
              const alt2Raw = readFileSync(alt2Path, 'utf-8');
              const alt2Data = parse(alt2Raw);
              alt2Contributors = resolveAffiliations(alt2Data);
            } catch (alt2Err) {
              console.warn(`authorship-plugin: Alt2 authors error: ${alt2Err.message}`);
            }
          }

          // Build the data envelope with primary + optional alt dataset
          const envelope = {
            primary: contributors,
            sourceFiles: [node.authorsPath || './authors.yml'],
          };
          if (altContributors) {
            envelope.alt = altContributors;
            envelope.altLabel = altLabel;
            if (node.authorsAltPath) envelope.sourceFiles.push(node.authorsAltPath);
          }
          if (alt2Contributors) {
            envelope.alt2 = alt2Contributors;
            envelope.alt2Label = alt2Label;
            if (node.authorsAlt2Path) envelope.sourceFiles.push(node.authorsAlt2Path);
          }

          // Convert to anywidget node
          node.type = 'anywidget';
          node.id = `authorship-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          node.esm = './authorship-widget.mjs';
          node.css = './authorship-widget.css';
          node.model = {
            authors: JSON.stringify(envelope),
            sectionLabels: JSON.stringify(sectionLabels),
            height: node.height || '800px',
          };
          delete node.authorsPath;
          delete node.authorsAltPath;
          delete node.altLabel;
          delete node.authorsAlt2Path;
          delete node.alt2Label;
          delete node.height;
        } catch (err) {
          console.warn(`authorship-plugin: Error: ${err.message}`);
          node.type = 'paragraph';
          node.children = [
            { type: 'text', value: `[Authorship Explorer: ${err.message}]` },
          ];
          delete node.authorsPath;
          delete node.height;
        }
      }

      if (node.children) {
        for (const child of node.children) {
          if (child) transform(child);
        }
      }
    }

    transform(tree);
  },
};

const notebookAuthorInjectTransform = {
  name: 'notebook-author-inject',
  stage: 'document',
  plugin: () => (tree, vfile) => {
    const filePath = (vfile?.path ?? '').replace(/\\/g, '/');
    // Only process notebooks
    if (!filePath.endsWith('.ipynb')) return;
    // Skip if the document already has an anywidget node at the root (e.g. from {authorship-explorer})
    if (tree.children?.[0]?.type === 'anywidget') return;

    // Read notebook metadata to get assigned author IDs
    let authorIds;
    let nb;
    try {
      nb = JSON.parse(readFileSync(vfile.path, 'utf-8'));
      authorIds = (nb.metadata?.authors ?? []).map(a => a.id).filter(Boolean);
    } catch {
      return;
    }
    if (!authorIds.length) return;

    // Respect per-notebook opt-out: set "inject_byline": false in notebook metadata
    if (nb.metadata?.inject_byline === false) return;

    // Respect global opt-out: settings.inject_byline: false in authors.yml
    try {
      const { parse } = require('yaml');
      const data = parse(readFileSync(resolve(__pluginDir, 'authors.yml'), 'utf-8'));
      if (data?.settings?.inject_byline === false) return;
    } catch { /* if unreadable, proceed */ }

    // Warn if myst.yml also lists project.authors — those will produce a native byline
    // alongside the injected widget byline, resulting in duplicate author entries.
    if (!_doubleAuthorWarned) {
      try {
        const { parse } = require('yaml');
        const mystData = parse(readFileSync(resolve(__pluginDir, 'myst.yml'), 'utf-8'));
        if (mystData?.project?.authors?.length) {
          console.warn(
            '\nauthorship-plugin WARNING: myst.yml has `project.authors` entries AND ' +
            'per-notebook byline injection is active.\n' +
            'This will produce duplicate author entries on notebook pages.\n' +
            'To fix, either:\n' +
            '  • Set `settings.inject_byline: false` in authors.yml to disable auto-injection, OR\n' +
            '  • Remove the `authors:` block from myst.yml `project` in favour of authors.yml.\n'
          );
          _doubleAuthorWarned = true;
        }
      } catch { /* myst.yml unreadable — skip check */ }
    }

    // Load contributors from authors.yml (always in the plugin directory)
    let contributorsById;
    try {
      contributorsById = loadContributorsByIdFromYml(resolve(__pluginDir, 'authors.yml'));
    } catch (err) {
      console.warn(`authorship-plugin: Could not load authors.yml: ${err.message}`);
      return;
    }

    const pageAuthors = authorIds.map(id => contributorsById[id]).filter(Boolean);
    if (!pageAuthors.length) return;

    // Compute paths from the notebook's directory back to the docs/ widget files
    const notebookDir = dirname(vfile.path);
    const relEsm = relative(notebookDir, resolve(__pluginDir, 'byline-widget.mjs')).replace(/\\/g, '/');
    const relCss = relative(notebookDir, resolve(__pluginDir, 'byline-widget.css')).replace(/\\/g, '/');

    // Prepend a compact static byline node to the document
    const widgetNode = {
      type: 'anywidget',
      id: `notebook-authors-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      esm: relEsm,
      css: relCss,
      model: {
        authors: JSON.stringify({ primary: pageAuthors, sourceFiles: ['./authors.yml'] }),
      },
    };
    tree.children.unshift(widgetNode);
  },
};

const plugin = {
  name: 'Authorship Explorer',
  directives: [authorshipDirective],
  transforms: [authorshipTransform, notebookAuthorInjectTransform],
};

export default plugin;
