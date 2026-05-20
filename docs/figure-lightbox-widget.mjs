// figure-lightbox-widget.mjs — anywidget
// Installs a single document-level click handler for <figure> <img> elements
// (skipping those whose figure has .no-zoom) and a <dialog> overlay with
// backdrop click + ESC to close and +/- / wheel to zoom.

const STATE_KEY = '__vipLightboxInstalled';
const STYLE_ID = 'vip-lightbox-style';
const DIALOG_ID = 'vip-lightbox-dialog';

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    figure:not(.no-zoom) img { cursor: zoom-in; }
    [data-name="safe-output-image"] img, [data-name="outputs-container"] img { cursor: zoom-in; }
    #${DIALOG_ID} {
      padding: 0; border: 0; background: transparent;
      max-width: 100vw; max-height: 100vh; width: 100vw; height: 100vh;
      color: #fff; overflow: hidden;
    }
    #${DIALOG_ID}::backdrop {
      background: rgba(0,0,0,0.88);
      backdrop-filter: blur(2px);
    }
    #${DIALOG_ID} .vip-lb-wrap {
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center;
      overflow: auto;
    }
    #${DIALOG_ID} img {
      max-width: 95vw; max-height: 92vh;
      object-fit: contain;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
      transform-origin: center center;
      transition: transform 0.12s ease-out;
      cursor: zoom-in;
      user-select: none;
    }
    #${DIALOG_ID} img.zoomed { cursor: zoom-out; }
    #${DIALOG_ID} .vip-lb-close {
      position: fixed; top: 14px; right: 18px;
      background: rgba(0,0,0,0.5); color: #fff;
      border: 1px solid rgba(255,255,255,0.3); border-radius: 999px;
      width: 40px; height: 40px; font-size: 22px; line-height: 1;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    #${DIALOG_ID} .vip-lb-close:hover { background: rgba(255,255,255,0.15); }
    #${DIALOG_ID} .vip-lb-caption {
      position: fixed; left: 0; right: 0; bottom: 0;
      padding: 10px 18px;
      background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
      font: 13px/1.4 system-ui, sans-serif;
      text-align: center; pointer-events: none;
    }
    #${DIALOG_ID} .vip-lb-hint {
      position: fixed; top: 14px; left: 18px;
      padding: 6px 10px;
      background: rgba(0,0,0,0.5); color: #fff;
      border-radius: 6px; font: 12px/1.3 system-ui, sans-serif;
      pointer-events: none;
    }
  `;
  document.head.appendChild(s);
}

function ensureDialog() {
  let dlg = document.getElementById(DIALOG_ID);
  if (dlg) return dlg;
  dlg = document.createElement('dialog');
  dlg.id = DIALOG_ID;
  dlg.innerHTML = `
    <div class="vip-lb-wrap">
      <img alt="" />
    </div>
    <button class="vip-lb-close" aria-label="Close">&times;</button>
    <div class="vip-lb-hint">Click image to toggle zoom · ESC to close</div>
    <div class="vip-lb-caption"></div>
  `;
  document.body.appendChild(dlg);

  const img = dlg.querySelector('img');
  const caption = dlg.querySelector('.vip-lb-caption');
  const closeBtn = dlg.querySelector('.vip-lb-close');

  let scale = 1;
  function setScale(s) {
    scale = Math.max(1, Math.min(s, 6));
    img.style.transform = `scale(${scale})`;
    img.classList.toggle('zoomed', scale > 1);
  }
  function reset() { setScale(1); }

  img.addEventListener('click', (e) => {
    e.stopPropagation();
    setScale(scale > 1 ? 1 : 2.2);
  });
  img.addEventListener('wheel', (e) => {
    e.preventDefault();
    setScale(scale + (e.deltaY < 0 ? 0.3 : -0.3));
  }, { passive: false });

  closeBtn.addEventListener('click', () => dlg.close());

  // Click on backdrop (outside the image/controls) closes.
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });

  dlg.addEventListener('close', () => { reset(); img.removeAttribute('src'); caption.textContent = ''; });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === '+' || e.key === '=') setScale(scale + 0.3);
    else if (e.key === '-' || e.key === '_') setScale(scale - 0.3);
    else if (e.key === '0') setScale(1);
  });

  dlg._vipOpen = (src, alt, cap) => {
    reset();
    img.src = src;
    img.alt = alt || '';
    caption.textContent = cap || '';
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  };
  return dlg;
}

function install() {
  if (window[STATE_KEY]) return;
  window[STATE_KEY] = true;
  ensureStyles();

  document.addEventListener('click', (e) => {
    const img = e.target.tagName === 'IMG' ? e.target : e.target.closest('img');
    if (!img) return;
    // Skip the widget's own dialog image
    if (img.closest(`#${DIALOG_ID}`)) return;
    // Skip nav/logo images
    if (img.closest('.myst-home-link-logo')) return;

    const fig = img.closest('figure');
    const isOutput = !!img.closest('[data-name="safe-output-image"], [data-name="outputs-container"]');

    // Only handle images inside figures or notebook cell outputs
    if (!fig && !isOutput) return;
    if (fig && fig.classList.contains('no-zoom')) return;
    if (img.classList.contains('no-zoom')) return;

    e.preventDefault();
    const dlg = ensureDialog();
    const src = img.currentSrc || img.src;
    const cap = fig ? (fig.querySelector('figcaption')?.innerText || '') : '';
    dlg._vipOpen(src, img.alt, cap);
  }, true);
}

export default {
  async initialize() { install(); },
  async render({ el }) {
    install();
    // Render nothing visible — the widget is a vehicle for the script.
    el.style.display = 'none';
  },
};