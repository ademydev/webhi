/* ==========================================================================
   BÖLÜMLER (50 bölüm, 5 aşama)
   Her 10 bölümde bir yeni nesne gelir:
     1-10   Temel nesneler: duvar, kurşun, diken, tuz, kutu, düğme, plaka, kapı
     11-20  + Yay (@)
     21-30  + Süreli kapı (t/T)
     31-40  + Işınlayıcı (1 2 3)
     41-50  + Testere (S ve raylar)

   Yeni bölüm eklemek için dosyanın sonuna bir addLevel({...}) bloğu yaz.
   Bölüm listesi, kilit sistemi ve "sonraki bölüm" düğmesi otomatik güncellenir.
   Süreli kapı kullanan bölümlerde "timer: saniye" alanını da yazabilirsin.

   Temel harita karakterleri (her satır aynı uzunlukta olmalı; dış çerçeve kalın
   duvardır, hayalet de geçemez):

     .  boş                       #  duvar (insan geçemez, hayalet geçer)
     L  kurşun duvar (ikisi de geçemez)
     h  insan başlangıcı          g  hayalet başlangıcı
     e  insan çıkışı              q  hayalet çıkışı
     ^  diken (insanı öldürür)    ~  tuz (hayaleti öldürür)
     o  kutu (sadece insan iter)

     a b c  insan düğmesi: insan ya da kutu üstünde durunca  A B C kapısı açılır
     x y z  hayalet plakası: hayalet üstünde durunca          X Y Z kapısı açılır
     A B C X Y Z  kapılar (kapalıyken ikisi için de katıdır)

   İpucu: kapıyı '#' sütununa yerleştirirsen hayalet duvarın içinden geçip
   kapıyı atlar; 'L' sütununa yerleştirirsen kapı hayalet için de engeldir.
   Yeni nesnelerin karakterleri aşağıdaki EKLENTİLER bölümünde açıklanmıştır.
   ========================================================================== */

const LEVELS = [];
function addLevel(def) { LEVELS.push(def); }

/* ==========================================================================
   EKLENTİLER: yeni nesneler
   Bu blok diğer dosyalara dokunmadan oyuna yeni nesneler ekler. Sayfa
   yüklenince parseLevel, stepLevel ve Renderer.draw işlevlerine bağlanır.
   Bölüm yazarken yeni karakterleri normal harita karakterleri gibi kullan.

   Yeni harita karakterleri:
     @        yay: insan üstüne gelince yüksek zıplar
     t u v    süreli plaka (insan, hayalet ya da kutu basar)
     T U V    süreli kapı: ilgili plakaya basıldıktan sonra bölümün
              "timer" saniyesi kadar açık kalır (varsayılan 4 sn)
     1 2 3    ışınlayıcı: aynı rakamdan tam iki tane olur, ikisi birbirine ışınlar
     S        testere (insanı ve hayaleti öldürür); '-' ya da '|' ile çizilen
              raylar boyunca gidip gelir. S bir rayın üstüne konur
     - |      yatay / dikey ray (sadece testere yolu, engel değildir)
   ========================================================================== */
function __installLevelExtensions() {
  if (window.__levelExtInstalled) return;
  window.__levelExtInstalled = true;

  const SPRING_V = 880, SAW_R = 10, SAW_SPEED = 80;
  const EXT_CHARS = '@tuvTUV123S-|';
  const TDOORS = 'TUV';
  const TCOL = { T: '#4fd1c5', U: '#ff9f43', V: '#c084fc' };
  const PCOL = { '1': '#ff7ad9', '2': '#7ad9ff', '3': '#ffd97a' };

  const _parse = parseLevel, _step = stepLevel, _solid = solidFor;

  solidFor = function (L, kind, tx, ty) {
    const c = tileChar(L, tx, ty);
    if (c === 'T' || c === 'U' || c === 'V') return !(L.ext && L.ext.timers[c] > 0);
    return _solid(L, kind, tx, ty);
  };

  parseLevel = function (def) {
    const rows = def.map.map(r => r.split(''));
    const X = { springs: [], tplates: [], tdoors: [], portals: [], saws: [], rails: [], timers: { T: 0, U: 0, V: 0 }, dur: def.timer || 4, inP: { h: false, g: false }, pulse: 0 };
    const raw = def.map;
    const at = (x, y) => (raw[y] && raw[y][x]) || '#';
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < rows[y].length; x++) {
        const ch = rows[y][x];
        if (EXT_CHARS.indexOf(ch) < 0) continue;
        rows[y][x] = '.';
        if (ch === '@') X.springs.push({ tx: x, ty: y });
        else if (ch === 't' || ch === 'u' || ch === 'v') X.tplates.push({ tx: x, ty: y, door: ch.toUpperCase(), pressed: false });
        else if (ch === 'T' || ch === 'U' || ch === 'V') X.tdoors.push({ tx: x, ty: y, ch });
        else if (ch === '1' || ch === '2' || ch === '3') X.portals.push({ tx: x, ty: y, id: ch });
        else if (ch === '-' || ch === '|') X.rails.push({ tx: x, ty: y, ch });
        else if (ch === 'S') {
          const hz = '-S'.indexOf(at(x - 1, y)) >= 0 || '-S'.indexOf(at(x + 1, y)) >= 0;
          const vt = '|S'.indexOf(at(x, y - 1)) >= 0 || '|S'.indexOf(at(x, y + 1)) >= 0;
          const axis = hz || !vt ? 'x' : 'y';
          const railCh = axis === 'x' ? '-' : '|', dx = axis === 'x' ? 1 : 0, dy = axis === 'x' ? 0 : 1;
          let a = 0, b = 0;
          while ((at(x - (a + 1) * dx, y - (a + 1) * dy) === railCh) || (at(x - (a + 1) * dx, y - (a + 1) * dy) === 'S')) a++;
          while ((at(x + (b + 1) * dx, y + (b + 1) * dy) === railCh) || (at(x + (b + 1) * dx, y + (b + 1) * dy) === 'S')) b++;
          X.rails.push({ tx: x, ty: y, ch: railCh });
          const c0 = (axis === 'x' ? x : y) - a, c1 = (axis === 'x' ? x : y) + b;
          X.saws.push({ axis, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, min: (c0 + 0.5) * TILE, max: (c1 + 0.5) * TILE, dir: 1, ang: 0 });
        }
      }
    }
    const L = _parse(Object.assign({}, def, { map: rows.map(r => r.join('')) }));
    for (const d of X.tdoors) L.grid[d.ty][d.tx] = d.ch;
    L.ext = X;
    return L;
  };

  const hitCircle = (cx, cy, r, b) => {
    const nx = Math.max(b.x, Math.min(cx, b.x + b.w)), ny = Math.max(b.y, Math.min(cy, b.y + b.h));
    return (nx - cx) * (nx - cx) + (ny - cy) * (ny - cy) < r * r;
  };
  const cxy = b => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

  stepLevel = function (L, input, dt) {
    const X = L.ext;
    if (!X) return _step(L, input, dt);
    const hm = L.hm, gh = L.gh;
    for (const k of TDOORS) if (X.timers[k] > 0) X.timers[k] = Math.max(0, X.timers[k] - dt);
    for (const p of X.tplates) {
      const z = { x: p.tx * TILE + 4, y: p.ty * TILE + 18, w: TILE - 8, h: 14 };
      p.pressed = overlap(z, hm) || overlap(z, gh) || L.boxes.some(b => overlap(z, b));
      if (p.pressed) X.timers[p.door] = X.dur;
    }
    for (const d of X.tdoors) {
      const r = { x: d.tx * TILE, y: d.ty * TILE, w: TILE, h: TILE };
      if (overlap(r, hm) || overlap(r, gh) || L.boxes.some(b => overlap(r, b))) X.timers[d.ch] = Math.max(X.timers[d.ch], 0.15);
    }
    for (const s of X.saws) {
      const k = s.axis;
      s[k] += s.dir * SAW_SPEED * dt;
      if (s[k] > s.max) { s[k] = s.max; s.dir = -1; }
      if (s[k] < s.min) { s[k] = s.min; s.dir = 1; }
      s.ang += dt * 9;
    }
    const ev = _step(L, input, dt);
    if (ev) return ev;
    if (X.pulse > 0) X.pulse -= dt;
    for (const s of X.springs) {
      const z = { x: s.tx * TILE + 3, y: s.ty * TILE + 12, w: TILE - 6, h: TILE - 12 };
      if (hm.onGround && overlap(z, hm)) { hm.vy = -SPRING_V; hm.onGround = false; hm.coyote = 0; hm.jumpBuf = 0; X.pulse = 0.3; X.pulseAt = s; }
    }
    if (X.portals.length) {
      for (const who of ['h', 'g']) {
        const b = who === 'h' ? hm : gh, c = cxy(b);
        const p = X.portals.find(q => c.x >= q.tx * TILE && c.x < (q.tx + 1) * TILE && c.y >= q.ty * TILE && c.y < (q.ty + 1) * TILE);
        if (!p) { X.inP[who] = false; continue; }
        if (X.inP[who]) continue;
        const o = X.portals.find(q => q !== p && q.id === p.id);
        if (!o) continue;
        if (who === 'h') { b.x = o.tx * TILE + (TILE - b.w) / 2; b.y = (o.ty + 1) * TILE - b.h; b.vx = 0; b.vy = 0; }
        else { b.x = o.tx * TILE + (TILE - b.w) / 2; b.y = o.ty * TILE + (TILE - b.h) / 2; }
        X.inP[who] = true;
      }
    }
    for (const s of X.saws) {
      if (hitCircle(s.x, s.y, SAW_R - 1, hm)) return { dead: 'human' };
      if (hitCircle(s.x, s.y, SAW_R - 1, gh)) return { dead: 'ghost' };
    }
    return null;
  };

  /* ---- Çizim ---- */
  if (typeof Renderer !== 'undefined' && typeof document !== 'undefined') {
    const _draw = Renderer.draw;
    const cv = () => document.getElementById('stage-canvas');
    const rrp = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };

    function drawExt(c, L, time) {
      const X = L.ext;
      c.save();
      c.strokeStyle = 'rgba(120,132,180,0.55)'; c.lineWidth = 2; c.setLineDash([3, 4]);
      for (const r of X.rails) {
        c.beginPath();
        if (r.ch === '-') { c.moveTo(r.tx * TILE, (r.ty + 0.5) * TILE); c.lineTo((r.tx + 1) * TILE, (r.ty + 0.5) * TILE); }
        else { c.moveTo((r.tx + 0.5) * TILE, r.ty * TILE); c.lineTo((r.tx + 0.5) * TILE, (r.ty + 1) * TILE); }
        c.stroke();
      }
      c.restore();
      for (const s of X.springs) {
        const x = s.tx * TILE, y = s.ty * TILE, sq = X.pulse > 0 && X.pulseAt === s ? 7 : 0;
        c.fillStyle = '#12162b'; rrp(c, x + 3, y + TILE - 6, TILE - 6, 6, 2); c.fill();
        c.strokeStyle = '#9aa6d8'; c.lineWidth = 2.5; c.lineJoin = 'round';
        c.beginPath(); const top = y + 12 + sq, bot = y + TILE - 6;
        c.moveTo(x + 8, bot);
        for (let i = 0; i < 4; i++) { c.lineTo(x + TILE - 8, bot - (bot - top) * (i + 0.5) / 4); c.lineTo(x + 8, bot - (bot - top) * (i + 1) / 4); }
        c.stroke();
        c.fillStyle = '#ef6f62'; rrp(c, x + 4, top - 5, TILE - 8, 6, 3); c.fill();
      }
      for (const p of X.tplates) {
        const x = p.tx * TILE, y = p.ty * TILE, col = TCOL[p.door], hgt = p.pressed ? 3 : 7;
        c.fillStyle = '#12162b'; rrp(c, x + 2, y + TILE - 10, TILE - 4, 10, 3); c.fill();
        c.fillStyle = col; rrp(c, x + 5, y + TILE - 3 - hgt, TILE - 10, hgt, 2); c.fill();
        c.strokeStyle = '#12162b'; c.lineWidth = 1.5; c.beginPath(); c.arc(x + TILE / 2, y + TILE - 8 - hgt / 2, 2.4, 0, 6.3); c.stroke();
      }
      for (const d of X.tdoors) {
        const x = d.tx * TILE, y = d.ty * TILE, col = TCOL[d.ch], t = X.timers[d.ch];
        if (t > 0) {
          c.save(); c.globalAlpha = 0.6; c.strokeStyle = col; c.lineWidth = 2; c.setLineDash([4, 5]);
          rrp(c, x + 5, y + 1, TILE - 10, TILE - 2, 4); c.stroke(); c.restore();
          c.strokeStyle = col; c.lineWidth = 3; c.beginPath();
          c.arc(x + TILE / 2, y + TILE / 2, 6, -Math.PI / 2, -Math.PI / 2 + 6.283 * Math.min(1, t / X.dur)); c.stroke();
        } else {
          c.fillStyle = '#12162b'; rrp(c, x + 3, y, TILE - 6, TILE, 3); c.fill();
          c.fillStyle = col; rrp(c, x + 5, y + 1, TILE - 10, TILE - 2, 3); c.fill();
          c.fillStyle = 'rgba(0,0,0,0.28)'; c.beginPath(); c.arc(x + TILE / 2, y + TILE / 2, 5, 0, 6.3); c.fill();
          c.fillStyle = col; c.fillRect(x + TILE / 2 - 1, y + TILE / 2 - 4, 2, 5);
        }
      }
      for (const p of X.portals) {
        const cx = (p.tx + 0.5) * TILE, cy = (p.ty + 0.5) * TILE, col = PCOL[p.id];
        c.save(); c.shadowColor = col; c.shadowBlur = 14; c.strokeStyle = col; c.lineWidth = 2.5;
        for (let i = 0; i < 3; i++) {
          const a = time * (2 + i) * (i % 2 ? -1 : 1), rx = 11 - i * 3, ry = 15 - i * 4;
          c.globalAlpha = 0.95 - i * 0.2; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, a, a + 4.4); c.stroke();
        }
        c.restore();
      }
      for (const s of X.saws) {
        c.save(); c.translate(s.x, s.y); c.rotate(s.ang);
        c.fillStyle = '#c9d2ee'; c.beginPath();
        for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, r = i % 2 ? SAW_R - 2.5 : SAW_R + 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        c.closePath(); c.fill();
        c.fillStyle = '#4b5578'; c.beginPath(); c.arc(0, 0, 3.4, 0, 6.3); c.fill();
        c.restore();
      }
    }

    function drawHumanX(c, hm, time) {
      const { x, y, w, h } = hm, sq = hm.onGround ? 0 : Math.max(-3, Math.min(3, -hm.vy / 220));
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(x + w / 2, y + h + 1, w / 2, 2.5, 0, 0, 6.3); c.fill();
      c.fillStyle = '#f2a65a'; rrp(c, x - sq / 2, y + sq, w + sq, h - sq, 9); c.fill();
      c.fillStyle = '#3a2410'; rrp(c, x + 3 + (hm.face > 0 ? 2 : 0), y + 5 + sq, w - 8, 11, 5); c.fill();
      c.fillStyle = '#fff'; const ex = x + w / 2 + hm.face * 3;
      c.beginPath(); c.arc(ex - 3, y + 10 + sq, 1.8, 0, 6.3); c.arc(ex + 3, y + 10 + sq, 1.8, 0, 6.3); c.fill();
      c.fillStyle = '#7a4a1e'; const st = hm.onGround && hm.vx ? Math.sin(time * 18) * 2 : 0;
      c.fillRect(x + 4, y + h - 3, 6, 3 + st * 0.5); c.fillRect(x + w - 10, y + h - 3, 6, 3 - st * 0.5);
    }
    function drawGhostX(c, L, gh, time) {
      const cx = gh.x + gh.w / 2, cy = gh.y + gh.h / 2 + Math.sin(time * 3) * 1.6, r = 13;
      const tx = Math.floor(cx / TILE), ty = Math.floor(cy / TILE);
      const inWall = tileChar(L, tx, ty) === '#' && !inRing(L, tx, ty);
      c.save(); c.globalAlpha = inWall ? 0.6 : 0.95; c.shadowColor = '#86e0cf'; c.shadowBlur = 16; c.fillStyle = '#e9fffb';
      c.beginPath(); c.moveTo(cx - r, cy + r); c.lineTo(cx - r, cy); c.arc(cx, cy, r, Math.PI, 0); c.lineTo(cx + r, cy + r);
      const n = 3, sw = 2 * r / n;
      for (let i = 0; i < n; i++) c.quadraticCurveTo(cx + r - sw * (i + 0.5), cy + r - 7, cx + r - sw * (i + 1), cy + r);
      c.closePath(); c.fill(); c.shadowBlur = 0; c.fillStyle = '#12313a'; const ex = gh.face * 2;
      c.beginPath(); c.ellipse(cx - 4 + ex, cy - 2, 2.2, 3, 0, 0, 6.3); c.ellipse(cx + 4 + ex, cy - 2, 2.2, 3, 0, 0, 6.3); c.fill();
      c.restore();
    }

    Renderer.draw = function (G, time) {
      const L = G.L;
      if (!L || !L.ext) return _draw(G, time);
      const hm = L.hm, gh = L.gh, hx = hm.x, hy = hm.y, gx = gh.x, gy = gh.y;
      hm.x = hm.y = gh.x = gh.y = -1000;
      try { _draw(G, time); } finally { hm.x = hx; hm.y = hy; gh.x = gx; gh.y = gy; }
      const c = cv().getContext('2d');
      drawExt(c, L, time);
      drawGhostX(c, L, gh, time);
      drawHumanX(c, hm, time);
    };
  }
}

if (typeof document !== 'undefined' && document.readyState === 'loading') document.addEventListener('DOMContentLoaded', __installLevelExtensions);
else if (typeof parseLevel === 'function') __installLevelExtensions();


/* ==========================================================================
   BÖLÜM LİSTESİ
   ========================================================================== */

/* ---- 1-10. bölümler: temel nesneler ---- */

addLevel({
  name: "Uyanış",
  hint: "Engeller insan, tuz perdeleri hayalet için.",
  map: [
    '#####################',
    '#............~......#',
    '#g...........~....q.#',
    '#............~......#',
    '#............~......#',
    '#...................#',
    '#...................#',
    '#............~......#',
    '#............~......#',
    '#h...###....#~....e.#',
    '#####################'
  ]
});

addLevel({
  name: "Kırık Basamak",
  hint: "Kutuyu düğmeye it, sonra üstünden atla.",
  map: [
    '#################',
    '#.........#.....#',
    '#g........#...q.#',
    '#.........#.....#',
    '#.........#.....#',
    '#.........#.....#',
    '#.........#.....#',
    '#.........#.....#',
    '#.........A.....#',
    '#h..o.a...A...e.#',
    '#################'
  ]
});

addLevel({
  name: "Kapalı Kapı",
  hint: "Hayalet plakada bekler, insan kapıdan geçer.",
  map: [
    '###############',
    '#.............#',
    '#g......L.....#',
    '#.......L.....#',
    '#.......L.....#',
    '#.......L...q.#',
    '#...x...L.....#',
    '#.......L.....#',
    '#.......X.....#',
    '#h...^..X...e.#',
    '###############'
  ]
});

addLevel({
  name: "Tuzlu Geçit",
  hint: "Engeller insan, tuz perdeleri hayalet için. Hayalet plakada bekler, insan kapıdan geçer.",
  map: [
    '##############################',
    '#......~....~................#',
    '#g.....~....~..........L.....#',
    '#......~....~..........L...q.#',
    '#......~....~..........L.....#',
    '#......~....~..........L.....#',
    '#...........~.......x..L.....#',
    '#......~...............L.....#',
    '#......~...#~..........X.....#',
    '#h...^^~...#~..........X...e.#',
    '##############################'
  ]
});

addLevel({
  name: "Eski Depo",
  hint: "Hayalet tuz labirentinden çıkış yolunu bulmalı. Kutuyu düğmeye it, sonra üstünden atla.",
  map: [
    '###########################',
    '#..LLLLLLL..........#.....#',
    '#g...~...L..........#.....#',
    '#..L.~.~.L..........#.....#',
    '#..L...~............#...q.#',
    '#..LLLLLLL..........#.....#',
    '#...................#.....#',
    '#...................#.....#',
    '#...................A.....#',
    '#h............o.a...A...e.#',
    '###########################'
  ]
});

addLevel({
  name: "Sessiz Labirent",
  hint: "Engeller insan, tuz perdeleri hayalet için. Kutu insan düğmesini tutsun, hayalet plakada beklesin.",
  map: [
    '############################',
    '#...~................L.....#',
    '#g..~................A.....#',
    '#....................A.....#',
    '#...~................L.....#',
    '#...~............x...L...q.#',
    '#...~................L.....#',
    '#...~................L.....#',
    '#...~###.............X.....#',
    '#h..~###......o.a....X...e.#',
    '############################'
  ]
});

addLevel({
  name: "Çifte Mühür",
  hint: "Hayalet plakada bekler, insan kapıdan geçer. Kutu insan düğmesini tutsun, hayalet plakada beklesin.",
  map: [
    '##########################',
    '#..................L.....#',
    '#g......L..........A.....#',
    '#.......L..........A...q.#',
    '#.......L..........L.....#',
    '#.......L.......x..L.....#',
    '#....x..L..........L.....#',
    '#.......L..........L.....#',
    '#.......X..........X.....#',
    '#h......X...o.a....X...e.#',
    '##########################'
  ]
});

addLevel({
  name: "Kurşun Koridor",
  hint: "Kutuyu kapıdan geçirirken hayalet plakada beklemeli.",
  map: [
    '#####################',
    '#..............#....#',
    '#g.......L.....#....#',
    '#........L.....#....#',
    '#........L.....#....#',
    '#...x....L.....#..q.#',
    '#........L.....#....#',
    '#........L.....#....#',
    '#........X.....A....#',
    '#h..^^..oX..a..A..e.#',
    '#####################'
  ]
});

addLevel({
  name: "Sisli Geçit",
  hint: "Hayalet plakada bekler, insan kapıdan geçer. Hayalet tuz labirentinden çıkış yolunu bulmalı.",
  map: [
    '###########################',
    '#...........LLLLLLLLL.....#',
    '#g......L.......~...L...q.#',
    '#.......L...L~~.~.~~L.....#',
    '#.......L...L.~.~...L.....#',
    '#.......L...L.~.~~~.L.....#',
    '#.......L...L.............#',
    '#.......L...LLLLLLLLL.....#',
    '#...x...L.................#',
    '#.......L.................#',
    '#.......X.................#',
    '#h......X...............e.#',
    '###########################'
  ]
});

addLevel({
  name: "Muhafız Odası",
  hint: "Kutuyu kapıdan geçirirken hayalet plakada beklemeli. Hayalet tuz labirentinden çıkış yolunu bulmalı.",
  map: [
    '###############################',
    '#..............#..LLLLLLL.....#',
    '#g.......L.....#......~.L.....#',
    '#........L.....#..L~~.~.L.....#',
    '#........L.....#..L.~.~.L.....#',
    '#....x...L.....#..L.~.~.L.....#',
    '#........L.....#..L...........#',
    '#........L.....#..LLLLLLL...q.#',
    '#........L.....#..............#',
    '#........L.....#..............#',
    '#........X.....A..............#',
    '#h..^^..oX..a..A............e.#',
    '###############################'
  ]
});

/* ---- 11-20. bölümler: yay ---- */

addLevel({
  name: "Zıplayan Taş",
  hint: "Yeni: Yay. İnsan üstüne basınca yükseğe fırlar. Yayla dikenli çukurun üstünden uç.",
  map: [
    '##################',
    '#................#',
    '#g.............q.#',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '#................#',
    '#h..@^^^^......e.#',
    '##################'
  ]
});

addLevel({
  name: "Yay Duvarı",
  hint: "Yayla yüksek duvarın üstüne çık.",
  map: [
    '###################',
    '#.................#',
    '#g................#',
    '#...............q.#',
    '#.................#',
    '#.................#',
    '#.................#',
    '#......####.......#',
    '#......####.......#',
    '#......####.......#',
    '#h..@..####.....e.#',
    '###################'
  ]
});

addLevel({
  name: "Çukur Kenarı",
  hint: "Yayla dikenli çukurun üstünden uç. Engeller insan, tuz perdeleri hayalet için.",
  map: [
    '##########################',
    '#...............~........#',
    '#g..............~........#',
    '#........................#',
    '#...............~........#',
    '#...............~......q.#',
    '#...............~........#',
    '#...............~........#',
    '#...............~........#',
    '#...............~#.......#',
    '#h..@^^^^.......~#.....e.#',
    '##########################'
  ]
});

addLevel({
  name: "Yüksek Raf",
  hint: "Yayla yüksek duvarın üstüne çık. Hayalet plakada bekler, insan kapıdan geçer.",
  map: [
    '############################',
    '#..........................#',
    '#g...................L...q.#',
    '#....................L.....#',
    '#....................L.....#',
    '#....................L.....#',
    '#......####..........L.....#',
    '#......####.......x..L.....#',
    '#......####..........L.....#',
    '#......####..........X.....#',
    '#h..@..####..........X...e.#',
    '############################'
  ]
});

addLevel({
  name: "Kule Dibi",
  hint: "Kutuyu düğmeye it, sonra üstünden atla. Yayla dikenli çukurun üstünden uç.",
  map: [
    '#############################',
    '#.........#.................#',
    '#g........#.................#',
    '#.........#...............q.#',
    '#.........#.................#',
    '#.........#.................#',
    '#.........#.................#',
    '#.........#.................#',
    '#.........#.................#',
    '#.........A.................#',
    '#h..o.a...A....@^^^^......e.#',
    '#############################'
  ]
});

addLevel({
  name: "Fırlatma",
  hint: "Yayla yüksek duvarın üstüne çık. Hayalet tuz labirentinden çıkış yolunu bulmalı.",
  map: [
    '##############################',
    '#..............LLLLLLLLL.....#',
    '#g...................~.L.....#',
    '#..............L~~~~.~.L.....#',
    '#..............L.............#',
    '#..............LLLLLLLLL.....#',
    '#......###.................q.#',
    '#......###...................#',
    '#......###...................#',
    '#......###...................#',
    '#h..@..###.................e.#',
    '##############################'
  ]
});

addLevel({
  name: "Gökyüzü Kapısı",
  hint: "Yayla dikenli çukurun üstünden uç. Yayla yüksek duvarın üstüne çık.",
  map: [
    '###############################',
    '#.............................#',
    '#g............................#',
    '#.............................#',
    '#.............................#',
    '#..................####.....q.#',
    '#..................####.......#',
    '#..................####.......#',
    '#..................####.......#',
    '#..................####.......#',
    '#h..@^^^^.......@..####.....e.#',
    '###############################'
  ]
});

addLevel({
  name: "Taş Merdiven",
  hint: "Hayalet plakada bekler, insan kapıdan geçer. Yayla yüksek duvarın üstüne çık.",
  map: [
    '###########################',
    '#.........................#',
    '#g......L.................#',
    '#.......L.................#',
    '#...x...L.................#',
    '#.......L.......###.......#',
    '#.......L.......###.....q.#',
    '#.......L.......###.......#',
    '#.......L.......###.......#',
    '#.......X.......###.......#',
    '#h...^..X....@..###.....e.#',
    '###########################'
  ]
});

addLevel({
  name: "Havada Beklemek",
  hint: "Kutu insan düğmesini tutsun, hayalet plakada beklesin. Yayla dikenli çukurun üstünden uç.",
  map: [
    '#############################',
    '#.........L.................#',
    '#g........A.................#',
    '#.........A.................#',
    '#.........L.................#',
    '#.........L.................#',
    '#......x..L...............q.#',
    '#.........L.................#',
    '#.........L.................#',
    '#.........X.................#',
    '#h.o.a....X....@^^^^......e.#',
    '#############################'
  ]
});

addLevel({
  name: "Kule Zirvesi",
  hint: "Kutuyu kapıdan geçirirken hayalet plakada beklemeli. Yayla yüksek duvarın üstüne çık.",
  map: [
    '##################################',
    '#..............#.................#',
    '#g.......L.....#.................#',
    '#........L.....#.................#',
    '#....x...L.....#.................#',
    '#........L.....#.................#',
    '#........L.....#......####.......#',
    '#........L.....#......####.....q.#',
    '#........L.....#......####.......#',
    '#........L.....#......####.......#',
    '#........X.....A......####.......#',
    '#h..^^..oX..a..A...@..####.....e.#',
    '##################################'
  ]
});

/* ---- 21-30. bölümler: süreli kapı ---- */

addLevel({
  name: "Kum Saati",
  hint: "Yeni: Süreli kapı. Plakaya basınca kapı birkaç saniye açık kalır. Plakaya bas, kapı kapanmadan koş.",
  timer: 4,
  map: [
    '##################',
    '#.........#......#',
    '#g........#......#',
    '#.........#....q.#',
    '#.........#......#',
    '#.........#......#',
    '#.........#......#',
    '#.........#......#',
    '#.........T......#',
    '#h.t......T....e.#',
    '##################'
  ]
});

addLevel({
  name: "Son Saniye",
  hint: "Plakaya bas, kapı kapanmadan koş.",
  timer: 2.6,
  map: [
    '###################',
    '#..........#......#',
    '#g.........#......#',
    '#..........#......#',
    '#..........#....q.#',
    '#..........#......#',
    '#..........#......#',
    '#..........#......#',
    '#..........T......#',
    '#h.t.^.....T....e.#',
    '###################'
  ]
});

addLevel({
  name: "Çift Kilit",
  hint: "İki süreli kapı art arda.",
  timer: 2,
  map: [
    '###########################',
    '#........#........#.......#',
    '#g.......#........#.......#',
    '#........#........#.....q.#',
    '#........#........#.......#',
    '#........#........#.......#',
    '#........#........#.......#',
    '#........#........#.......#',
    '#........T........U.......#',
    '#h.t.....T..u.....U.....e.#',
    '###########################'
  ]
});

addLevel({
  name: "Koşu Yolu",
  hint: "Plakaya bas, kapı kapanmadan koş. Hayalet plakada bekler, insan kapıdan geçer.",
  timer: 2.3,
  map: [
    '############################',
    '#..........#...............#',
    '#g.........#.........L.....#',
    '#..........#.....x...L.....#',
    '#..........#.........L.....#',
    '#..........#.........L.....#',
    '#..........#.........L...q.#',
    '#..........#.........L.....#',
    '#..........T.........X.....#',
    '#h.t.^.....T.........X...e.#',
    '############################'
  ]
});

addLevel({
  name: "Zamana Karşı",
  hint: "Kutuyu düğmeye it, sonra üstünden atla. Plakaya bas, kapı kapanmadan koş.",
  timer: 2.7,
  map: [
    '###############################',
    '#.........#............#......#',
    '#g........#............#....q.#',
    '#.........#............#......#',
    '#.........#............#......#',
    '#.........#............#......#',
    '#.........#............#......#',
    '#.........#............#......#',
    '#.........A............T......#',
    '#h..o.a...A...t.^^.....T....e.#',
    '###############################'
  ]
});

addLevel({
  name: "Tik Tak",
  hint: "Plakaya bas, kapı kapanmadan koş. Yayla yüksek duvarın üstüne çık.",
  timer: 2,
  map: [
    '###############################',
    '#.........#...................#',
    '#g........#...................#',
    '#.........#...................#',
    '#.........#.................q.#',
    '#.........#...................#',
    '#.........#........####.......#',
    '#.........#........####.......#',
    '#.........#........####.......#',
    '#.........T........####.......#',
    '#h.t.^^...T.....@..####.....e.#',
    '###############################'
  ]
});

addLevel({
  name: "Kısa Fitil",
  hint: "İki süreli kapı art arda.",
  timer: 2,
  map: [
    '###########################',
    '#........#........#.......#',
    '#g.......#........#.....q.#',
    '#........#........#.......#',
    '#........#........#.......#',
    '#........#........#.......#',
    '#........#........#.......#',
    '#........#........#.......#',
    '#........T........U.......#',
    '#h.t..^..T..u..^^.U.....e.#',
    '###########################'
  ]
});

addLevel({
  name: "Nefes Payı",
  hint: "Hayalet tuz labirentinden çıkış yolunu bulmalı. Plakaya bas, kapı kapanmadan koş.",
  timer: 2.4,
  map: [
    '################################',
    '#..LLLLLLLLL............#......#',
    '#g.....~...L............#......#',
    '#..L~~.~.~.L............#......#',
    '#..L.~.~.~.L............#......#',
    '#..L.~.~~~.L............#....q.#',
    '#..L....................#......#',
    '#..LLLLLLLLL............#......#',
    '#.......................#......#',
    '#.......................#......#',
    '#.......................T......#',
    '#h.............t.^^.....T....e.#',
    '################################'
  ]
});

addLevel({
  name: "Acele",
  hint: "Plakaya bas, kapı kapanmadan koş. Yayla dikenli çukurun üstünden uç.",
  timer: 2.4,
  map: [
    '################################',
    '#...........#..................#',
    '#g..........#..................#',
    '#...........#..................#',
    '#...........#................q.#',
    '#...........#..................#',
    '#...........#..................#',
    '#...........#..................#',
    '#...........#..................#',
    '#...........T..................#',
    '#h.t.^......T.....@^^^^......e.#',
    '################################'
  ]
});

addLevel({
  name: "Saat Kulesi",
  hint: "Plakaya bas, kapı kapanmadan koş. Kutu insan düğmesini tutsun, hayalet plakada beklesin.",
  timer: 2.4,
  map: [
    '###############################',
    '#...........#...........L.....#',
    '#g..........#...........A.....#',
    '#...........#...........A.....#',
    '#...........#........x..L...q.#',
    '#...........#...........L.....#',
    '#...........#...........L.....#',
    '#...........#...........L.....#',
    '#...........T...........X.....#',
    '#h.t.^^.....T....o.a....X...e.#',
    '###############################'
  ]
});

/* ---- 31-40. bölümler: ışınlayıcı ---- */

addLevel({
  name: "İlk Halka",
  hint: "Yeni: Işınlayıcı. Aynı renkli iki halka birbirine ışınlar. İnsan da hayalet de kullanabilir. Kurşun duvarı ışınlayıcıyla geç.",
  map: [
    '###################',
    '#......L..........#',
    '#g.....L........q.#',
    '#......L..........#',
    '#......L..........#',
    '#......L..........#',
    '#......L..........#',
    '#......L..........#',
    '#......L..........#',
    '#h...1.L..1.....e.#',
    '###################'
  ]
});

addLevel({
  name: "Öbür Taraf",
  hint: "Kurşun duvarı ışınlayıcıyla geç.",
  map: [
    '###################',
    '#......L..........#',
    '#g.....L..........#',
    '#......L..........#',
    '#......L........q.#',
    '#......L..........#',
    '#......L..........#',
    '#....2.L..........#',
    '#...##.L..........#',
    '#h..##.L..2.....e.#',
    '###################'
  ]
});

addLevel({
  name: "Yankı Kapısı",
  hint: "Kurşun duvarı ışınlayıcıyla geç.",
  map: [
    '###################',
    '#......L..........#',
    '#g.....L..........#',
    '#......L........q.#',
    '#......L..........#',
    '#......L..........#',
    '#......L..........#',
    '#......L..........#',
    '#......L..........#',
    '#h...3.L..3^^...e.#',
    '###################'
  ]
});

addLevel({
  name: "Çifte Halka",
  hint: "Kurşun duvarı ışınlayıcıyla geç. Hayalet plakada bekler, insan kapıdan geçer.",
  map: [
    '############################',
    '#......L...................#',
    '#g.....L.............L...q.#',
    '#......L.............L.....#',
    '#......L..........x..L.....#',
    '#......L.............L.....#',
    '#......L.............L.....#',
    '#......L.............L.....#',
    '#......L.............X.....#',
    '#h...1.L..1^^........X...e.#',
    '############################'
  ]
});

addLevel({
  name: "Ayna Oda",
  hint: "Kurşun duvarı ışınlayıcıyla geç. Engeller insan, tuz perdeleri hayalet için.",
  map: [
    '#############################',
    '#......L..............~.....#',
    '#g.....L..............~.....#',
    '#......L..............~.....#',
    '#......L..............~.....#',
    '#......L....................#',
    '#......L..............~...q.#',
    '#....2.L..............~.....#',
    '#...##.L..............~.....#',
    '#h..##.L..2^^.....^^..~...e.#',
    '#############################'
  ]
});

addLevel({
  name: "Kayıp Yol",
  hint: "Kurşun duvarı ışınlayıcıyla geç. Hayalet tuz labirentinden çıkış yolunu bulmalı.",
  map: [
    '###############################',
    '#......L........LLLLLLLLL.....#',
    '#g.....L..........~.....L.....#',
    '#......L........L.~~~.~.L.....#',
    '#......L........L.....~.L.....#',
    '#......L........L~~~~~~.L...q.#',
    '#......L........L.............#',
    '#......L........LLLLLLLLL.....#',
    '#......L......................#',
    '#....1.L......................#',
    '#...##.L......................#',
    '#h..##.L..1.................e.#',
    '###############################'
  ]
});

addLevel({
  name: "Eşik",
  hint: "Kurşun duvarı ışınlayıcıyla geç. Yayla yüksek duvarın üstüne çık.",
  map: [
    '################################',
    '#......L.......................#',
    '#g.....L.......................#',
    '#......L.......................#',
    '#......L.......................#',
    '#......L.......................#',
    '#......L............####.......#',
    '#......L............####.....q.#',
    '#......L............####.......#',
    '#......L............####.......#',
    '#h...3.L..3^^....@..####.....e.#',
    '################################'
  ]
});

addLevel({
  name: "Sarmal Geçit",
  hint: "Kurşun duvarı ışınlayıcıyla geç. Plakaya bas, kapı kapanmadan koş.",
  timer: 2,
  map: [
    '################################',
    '#......L................#......#',
    '#g.....L................#......#',
    '#......L................#......#',
    '#......L................#....q.#',
    '#......L................#......#',
    '#......L................#......#',
    '#....1.L................#......#',
    '#...##.L................T......#',
    '#h..##.L..1.....t.^.....T....e.#',
    '################################'
  ]
});

addLevel({
  name: "Dönüşüm",
  hint: "Kurşun duvarı ışınlayıcıyla geç.",
  map: [
    '################################',
    '#......L............L..........#',
    '#g.....L............L..........#',
    '#......L............L........q.#',
    '#......L............L..........#',
    '#......L............L..........#',
    '#......L............L..........#',
    '#......L..........2.L..........#',
    '#......L.........##.L..........#',
    '#h...1.L..1^^....##.L..2.....e.#',
    '################################'
  ]
});

addLevel({
  name: "Işık Köprüsü",
  hint: "Kurşun duvarı ışınlayıcıyla geç. Kutuyu düğmeye it, sonra üstünden atla.",
  map: [
    '##############################',
    '#......L...............#.....#',
    '#g.....L...............#.....#',
    '#......L...............#.....#',
    '#......L...............#.....#',
    '#......L...............#.....#',
    '#......L...............#...q.#',
    '#......L...............#.....#',
    '#......L...............#.....#',
    '#....2.L...............#.....#',
    '#...##.L...............A.....#',
    '#h..##.L..2^^....o.a...A...e.#',
    '##############################'
  ]
});

/* ---- 41-50. bölümler: testere ---- */

addLevel({
  name: "Paslı Dişli",
  hint: "Yeni: Testere. Raylarda gidip gelir, insanı da hayaleti de öldürür. Testere geçidinde doğru anı bekle.",
  map: [
    '################',
    '#....L.........#',
    '#g...L.........#',
    '#....L.........#',
    '#....L.......q.#',
    '#....L.........#',
    '#....L.........#',
    '#....S.........#',
    '#....|.........#',
    '#h...|.......e.#',
    '################'
  ]
});

addLevel({
  name: "Demir Yağmuru",
  hint: "Zemin testeresini zıplayarak geç.",
  map: [
    '##################',
    '#................#',
    '#g...............#',
    '#................#',
    '#................#',
    '#................#',
    '#..............q.#',
    '#................#',
    '#................#',
    '#h...S----.....e.#',
    '##################'
  ]
});

addLevel({
  name: "Keskin Sessizlik",
  hint: "Testere geçidinde doğru anı bekle.",
  map: [
    '#####################',
    '#....L....L.........#',
    '#g...L....L.........#',
    '#....L....L.........#',
    '#....L....L.........#',
    '#....L....L.......q.#',
    '#....L....L.........#',
    '#....S....S.........#',
    '#....|....|.........#',
    '#h...|....|.......e.#',
    '#####################'
  ]
});

addLevel({
  name: "Çarkların Arası",
  hint: "Zemin testeresini zıplayarak geç. Hayalet plakada bekler, insan kapıdan geçer.",
  map: [
    '############################',
    '#..........................#',
    '#g...................L.....#',
    '#....................L...q.#',
    '#....................L.....#',
    '#..................x.L.....#',
    '#....................L.....#',
    '#....................L.....#',
    '#....................X.....#',
    '#h...S-----..........X...e.#',
    '############################'
  ]
});

addLevel({
  name: "Kıl Payı",
  hint: "Testere geçidinde doğru anı bekle. Kutuyu düğmeye it, sonra üstünden atla.",
  map: [
    '###########################',
    '#....L..............#.....#',
    '#g...L..............#.....#',
    '#....L..............#.....#',
    '#....L..............#...q.#',
    '#....L..............#.....#',
    '#....L..............#.....#',
    '#....S..............#.....#',
    '#....|..............A.....#',
    '#h.^.|........o.a...A...e.#',
    '###########################'
  ]
});

addLevel({
  name: "Testere Bahçesi",
  hint: "Testere geçidinde doğru anı bekle. Kurşun duvarı ışınlayıcıyla geç.",
  map: [
    '#############################',
    '#....L...........L..........#',
    '#g...L...........L..........#',
    '#....L...........L..........#',
    '#....L...........L........q.#',
    '#....L...........L..........#',
    '#....L...........L..........#',
    '#....S...........L..........#',
    '#....|...........L..........#',
    '#h...|.........1.L..1^^...e.#',
    '#############################'
  ]
});

addLevel({
  name: "Son Nefes",
  hint: "Zemin testeresini zıplayarak geç. Yayla yüksek duvarın üstüne çık.",
  map: [
    '###############################',
    '#.............................#',
    '#g............................#',
    '#.............................#',
    '#.............................#',
    '#.............................#',
    '#..................####.......#',
    '#..................####.....q.#',
    '#..................####.......#',
    '#..................####.......#',
    '#h...S----......@..####.....e.#',
    '###############################'
  ]
});

addLevel({
  name: "Zamanlama",
  hint: "Testere geçidinde doğru anı bekle. Plakaya bas, kapı kapanmadan koş.",
  timer: 2,
  map: [
    '##################################',
    '#....L....L...............#......#',
    '#g...L....L...............#......#',
    '#....L....L...............#......#',
    '#....L....L...............#......#',
    '#....L....L...............#......#',
    '#....L....L...............#....q.#',
    '#....S....S...............#......#',
    '#....|....|...............T......#',
    '#h...|....|.......t.^.....T....e.#',
    '##################################'
  ]
});

addLevel({
  name: "Kapanış Provası",
  hint: "Testere geçidinde doğru anı bekle. Hayalet tuz labirentinden çıkış yolunu bulmalı.",
  map: [
    '############################',
    '#....L.......LLLLLLLLL.....#',
    '#g...L.........~.....L.....#',
    '#....L.......L.~.~.~.L.....#',
    '#....L.......L.~.~.~.L.....#',
    '#....L.......L.~~~.~.L...q.#',
    '#....L.......L.....~.......#',
    '#....L.......LLLLLLLLL.....#',
    '#....L.....................#',
    '#....S.....................#',
    '#....|.....................#',
    '#h...|...................e.#',
    '############################'
  ]
});

addLevel({
  name: "Hayalet ve İnsan",
  hint: "Testere geçidinde doğru anı bekle. Zemin testeresini zıplayarak geç.",
  map: [
    '#################################',
    '#....L....L.....................#',
    '#g...L....L.....................#',
    '#....L....L.....................#',
    '#....L....L.....................#',
    '#....L....L.....................#',
    '#....L....L...................q.#',
    '#....S....S.....................#',
    '#....|....|.....................#',
    '#h.^.|..^.|.........S----.....e.#',
    '#################################'
  ]
});