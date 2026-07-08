import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __pluginDir = dirname(fileURLToPath(import.meta.url));
const __repoRoot = resolve(__pluginDir, '..');

function isNotebookFile(vfile) {
  return typeof vfile?.path === 'string' && vfile.path.toLowerCase().endsWith('.ipynb');
}

function toPosixPath(value) {
  return value.replace(/\\/g, '/');
}

const colabBadgeTransform = {
  name: 'colab-badge-injector',
  stage: 'document',
  plugin: () => (tree, vfile) => {
    if (!isNotebookFile(vfile)) return;

    const notebookPath = toPosixPath(relative(__repoRoot, vfile.path));
    const colabUrl = `https://colab.research.google.com/github/AllenInstitute/openscope_databook/blob/HEAD/${notebookPath}`;
    const badgeUrl = 'https://colab.research.google.com/assets/colab-badge.svg';

    const badgeNode = {
      type: 'paragraph',
      children: [
        {
          type: 'link',
          url: colabUrl,
          children: [
            {
              type: 'image',
              url: badgeUrl,
              alt: 'Open In Colab',
            },
          ],
        },
      ],
    };

    tree.children = tree.children || [];

    const titleIndex = tree.children.findIndex(
      (node) => node?.type === 'heading' && node.depth === 1,
    );

    const insertIndex = titleIndex >= 0 ? titleIndex + 1 : 0;
    tree.children.splice(insertIndex, 0, badgeNode);
  },
};

const plugin = {
  name: 'Colab Badge',
  transforms: [colabBadgeTransform],
};

export default plugin;