/* Klavye (WASD + oklar) ve dokunmatik tuşlar. Aynı anda ikisi de çalışır. */
const Input = (() => {
  const kb = {};
  let touch = {};
  let mouseAct = null;
  const KEYMAP = {
    KeyA: 'hLeft', KeyD: 'hRight', KeyW: 'hJump',
    ArrowLeft: 'gLeft', ArrowRight: 'gRight', ArrowUp: 'gUp', ArrowDown: 'gDown'
  };
  const handlers = { restart: null, menu: null };

  function paintButtons() {
    document.querySelectorAll('[data-act]').forEach(b => {
      const a = b.dataset.act;
      b.classList.toggle('on', !!(touch[a] || mouseAct === a));
    });
  }

  function onKey(e, down) {
    const act = KEYMAP[e.code];
    if (act) { kb[act] = down; e.preventDefault(); return; }
    if (down && !e.repeat) {
      if (e.code === 'KeyR' && handlers.restart) handlers.restart();
      else if (e.code === 'Escape' && handlers.menu) handlers.menu();
    }
  }

  function enableTouchUI() { document.body.classList.add('touch'); window.dispatchEvent(new Event('resize')); }

  function bindTouch() {
    if (('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0) document.body.classList.add('touch');
    window.addEventListener('touchstart', () => { if (!document.body.classList.contains('touch')) enableTouchUI(); }, { passive: true });

    const refresh = e => {
      const t = {};
      for (const tc of e.touches) {
        const el = document.elementFromPoint(tc.clientX, tc.clientY);
        const b = el && el.closest ? el.closest('[data-act]') : null;
        if (b) t[b.dataset.act] = true;
      }
      touch = t;
      paintButtons();
    };
    document.querySelectorAll('.pad').forEach(pad => {
      ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(ev =>
        pad.addEventListener(ev, e => { e.preventDefault(); refresh(e); }, { passive: false }));
      pad.addEventListener('mousedown', e => {
        const b = e.target.closest('[data-act]');
        if (b) { mouseAct = b.dataset.act; paintButtons(); }
      });
      pad.addEventListener('contextmenu', e => e.preventDefault());
    });
    window.addEventListener('mouseup', () => { if (mouseAct) { mouseAct = null; paintButtons(); } });
  }

  function init() {
    window.addEventListener('keydown', e => onKey(e, true));
    window.addEventListener('keyup', e => onKey(e, false));
    window.addEventListener('blur', () => { for (const k in kb) kb[k] = false; touch = {}; mouseAct = null; paintButtons(); });
    bindTouch();
  }

  return {
    init,
    on(name, fn) { handlers[name] = fn; },
    held(a) { return !!(kb[a] || touch[a] || mouseAct === a); }
  };
})();
