/**
 * version-plugin.mjs — MyST plugin for inserting the git version tag
 *
 * Provides the {version} directive, ported from the Sphinx extension in
 * databook_utils/insert_authors_version.py.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * {version} DIRECTIVE
 * ─────────────────────────────────────────────────────────────────────────────
 * Inserts the latest git tag (from `git describe --tags --abbrev=0`) as
 * inline text. Optionally accepts a URL argument to render the version as
 * a hyperlink.
 *
 * Usage in a MyST markdown/notebook file:
 *
 *   Plain text:
 *     ```{version}
 *     ```
 *
 *   As a hyperlink:
 *     ```{version} https://github.com/AllenInstitute/openscope_databook/releases
 *     ```
 */

import { execSync } from 'node:child_process';

function getLatestGitTag() {
  try {
    return execSync('git describe --tags --abbrev=0', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (e) {
    throw new Error(
      `There are no git tags from which to get the version number.\nerror:\n${e.message}`
    );
  }
}

const versionDirective = {
  name: 'version',
  doc: 'Insert the latest git tag as a version number. Optionally provide a URL argument to link the version.',
  arg: {
    type: String,
    doc: 'Optional URL to wrap the version text in a hyperlink.',
  },
  run(data) {
    const version = getLatestGitTag();
    const url = data.arg?.trim() || null;

    if (url) {
      return [
        {
          type: 'paragraph',
          children: [
            {
              type: 'link',
              url,
              children: [{ type: 'text', value: version }],
            },
          ],
        },
      ];
    }

    return [
      {
        type: 'paragraph',
        children: [{ type: 'text', value: version }],
      },
    ];
  },
};

const plugin = {
  name: 'Version',
  directives: [versionDirective],
};

export default plugin;
