/* Başlatma, oyun döngüsü ve durum yönetimi. */
(function () {
  const STEP = 1 / 120;
  const G = { state: 'menu', index: 0, L: null, t: 0, deaths: 0, deadT: 0, winT: 0, parts: [] };

  function startLevel(i, keepDeaths) {
    let L;
    try { L = parseLevel(LEVELS[i]); }
    catch (err) { console.error(err); document.getElementById('hud-hint').textContent = err.message; return; }
    G.index = i; G.L = L; G.state = 'play'; G.winT = 0; G.parts = [];
    if (!keepDeaths) G.deaths = 0;
    UI.show('game');
    UI.setHud(i, LEVELS[i]);
    UI.setDeaths(G.deaths);
    Renderer.fit(L);
    requestAnimationFrame(() => Renderer.fit(G.L));
  }

  function restart() { if (G.state !== 'menu') startLevel(G.index, true); }
  function toMenu() { G.state = 'menu'; UI.hideWin(); UI.buildMenu(); UI.show('menu'); }
  function next() { if (G.index + 1 < LEVELS.length) startLevel(G.index + 1); }

  function die(who) {
    G.state = 'dead'; G.deadT = 0.7; G.deaths++;
    PlayerFX.burst(G.parts, who === 'human' ? G.L.hm : G.L.gh, who);
    UI.setDeaths(G.deaths);
  }

  function win() {
    G.state = 'won';
    Store.unlock(Math.min(G.index + 2, LEVELS.length));
    UI.showWin(G.index, G.deaths);
  }

  function tick(dt) {
    G.t += dt;
    PlayerFX.update(G.parts, dt);
    if (G.state === 'dead') { G.deadT -= dt; if (G.deadT <= 0) startLevel(G.index, true); return; }
    if (G.state !== 'play') return;
    const ev = stepLevel(G.L, Input, dt);
    if (ev && ev.dead) { die(ev.dead); return; }
    if (G.L.atH && G.L.atG) { G.winT += dt; if (G.winT > 0.4) win(); } else G.winT = 0;
  }

  let last = performance.now(), acc = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (G.state !== 'menu') {
      acc += dt;
      while (acc >= STEP) { tick(STEP); acc -= STEP; }
      Renderer.draw(G, now / 1000);
    }
    requestAnimationFrame(frame);
  }

  function boot() {
    Store.init();
    Input.init();
    Input.on('restart', restart);
    Input.on('menu', () => { if (G.state !== 'menu') toMenu(); });
    Renderer.init(document.getElementById('stage-canvas'));
    UI.init({ play: i => startLevel(i), menu: toMenu, restart, next });
    UI.buildMenu();
    UI.show('menu');
    const refit = () => Renderer.fit(G.L);
    window.addEventListener('resize', refit);
    window.addEventListener('orientationchange', () => setTimeout(refit, 150));
    if (window.ResizeObserver) new ResizeObserver(refit).observe(document.getElementById('stage-wrap'));
    window.__game = G; // test ve hata ayıklama için
    requestAnimationFrame(frame);
  }

  boot();
})();
