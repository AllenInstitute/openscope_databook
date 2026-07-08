// authorship-plugin-shim.mjs
// Wraps the upstream AuthorshipExtractor plugin and rewrites widget asset paths
// so MyST resolves them correctly from each source document.

import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import upstreamPlugin from './node_modules/authorship-extractor/authorship-plugin.mjs';

const __pluginDir = dirname(fileURLToPath(import.meta.url));
const widgetEsmAbs = resolve(__pluginDir, 'node_modules/authorship-extractor/authorship-widget.mjs');
const widgetCssAbs = resolve(__pluginDir, 'node_modules/authorship-extractor/authorship-widget.css');

function toRelPath(fromDir, toFile) {
  const rel = relative(fromDir, toFile).replace(/\\/g, '/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

const authorshipPathRewriteTransform = {
  name: 'authorship-path-rewrite',
  stage: 'document',
  plugin: () => (tree, vfile) => {
    const docDir = vfile?.path ? dirname(vfile.path) : process.cwd();
    const esmPath = toRelPath(docDir, widgetEsmAbs);
    const cssPath = toRelPath(docDir, widgetCssAbs);

    function visit(node) {
      if (!node) return;

      if (
        node.type === 'anywidget' &&
        typeof node.id === 'string' &&
        node.id.startsWith('authorship-')
      ) {
        node.esm = esmPath;
        node.css = cssPath;
      }

      if (Array.isArray(node.children)) {
        for (const child of node.children) visit(child);
      }
    }

    visit(tree);
  },
};

const plugin = {
  ...upstreamPlugin,
  name: `${upstreamPlugin.name} (path shim)`,
  transforms: [
    ...(upstreamPlugin.transforms || []),
    authorshipPathRewriteTransform,
  ],
};

export default plugin;
