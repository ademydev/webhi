/* Menü, bölüm seçimi, üst bar ve bölüm sonu ekranı. */
const UI = (() => {
  const $ = id => document.getElementById(id);
  let h = {};

  function show(which) {
    $('menu').classList.toggle('active', which === 'menu');
    $('game').classList.toggle('active', which === 'game');
  }

  function buildMenu() {
    const grid = $('level-grid');
    grid.innerHTML = '';
    const progress = Math.min(Store.unlocked, LEVELS.length);
    LEVELS.forEach((lv, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lv' + (i < progress - 1 ? ' done' : '');
      b.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="t"></span>';
      b.querySelector('.t').textContent = lv.name;
      b.addEventListener('click', () => h.play(i));
      grid.appendChild(b);
    });
    const next = Math.min(progress - 1, LEVELS.length - 1);
    $('btn-continue').textContent = progress === 1 ? 'Oyuna başla' : 'Devam et: ' + (next + 1) + '. bölüm';
    $('btn-continue').onclick = () => h.play(next);
  }

  function setHud(i, lv) {
    $('hud-title').textContent = (i + 1) + '. ' + lv.name;
    $('hud-hint').textContent = lv.hint;
    setDeaths(0);
    hideWin();
  }
  function setDeaths(n) { $('hud-deaths').textContent = n ? n + ' ölüm' : ''; }

  function showWin(i, deaths) {
    const last = i >= LEVELS.length - 1;
    $('win-title').textContent = last ? 'Tüm bölümler tamam' : 'Bölüm tamam';
    $('win-text').textContent = deaths ? deaths + ' ölümle geçtiniz.' : 'Hiç ölmeden geçtiniz.';
    $('win-next').hidden = last;
    $('win').classList.add('open');
    ($('win-next').hidden ? $('win-menu') : $('win-next')).focus();
  }
  function hideWin() { $('win').classList.remove('open'); }

  function init(handlers) {
    h = handlers;
    $('btn-menu').onclick = h.menu;
    $('btn-restart').onclick = h.restart;
    $('win-next').onclick = h.next;
    $('win-again').onclick = h.restart;
    $('win-menu').onclick = h.menu;
    $('btn-reset').onclick = () => { Store.reset(); buildMenu(); };
  }

  return { init, show, buildMenu, setHud, setDeaths, showWin, hideWin };
})();
