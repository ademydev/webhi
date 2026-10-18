/* Canvas çizimi. Mantıksal çözünürlük bölüm boyutuna göre (kare = 32), ekrana sığacak şekilde ölçeklenir. */
const Renderer = (() => {
  let canvas, ctx, wrap;
  const COL = {
    bg0: '#0d1121', bg1: '#1a2140', wall: '#232b4b', wallHi: '#3a4570', wallLo: '#1a2038',
    lead0: '#383e54', lead1: '#555d7a', human: '#f2a65a', ghost: '#86e0cf', danger: '#ef5a67', salt: '#eaf5f8'
  };
  const DOOR = { A: '#ef6f62', B: '#5aa9ee', C: '#b6dc5c', X: '#a98bf2', Y: '#f080b9', Z: '#f2cf5a' };

  function init(c) { canvas = c; ctx = c.getContext('2d'); wrap = c.parentElement; }

  function fit(L) {
    if (!L || !wrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const aw = wrap.clientWidth, ah = wrap.clientHeight;
    if (!aw || !ah) return;
    const s = Math.min(aw / (L.w * TILE), ah / (L.h * TILE));
    const cw = Math.floor(L.w * TILE * s), ch = Math.floor(L.h * TILE * s);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  const hash = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;

  function drawBackground(L) {
    const W = L.w * TILE, H = L.h * TILE;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, COL.bg1); g.addColorStop(1, COL.bg0);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(160,175,230,0.07)';
    for (let y = 1; y < L.h; y++) for (let x = 1; x < L.w; x++) ctx.fillRect(x * TILE - 1, y * TILE - 1, 2, 2);
  }

  function drawLead(x, y) {
    ctx.fillStyle = COL.lead0; ctx.fillRect(x, y, TILE, TILE);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, TILE, TILE); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 4;
    for (let k = -TILE; k < TILE * 2; k += 10) { ctx.beginPath(); ctx.moveTo(x + k, y + TILE); ctx.lineTo(x + k + TILE, y); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = COL.lead1; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    ctx.fillStyle = '#8a92ae';
    for (const [dx, dy] of [[5, 5], [27, 5], [5, 27], [27, 27]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, 1.6, 0, 6.3); ctx.fill(); }
  }

  function drawWall(L, tx, ty) {
    const x = tx * TILE, y = ty * TILE;
    ctx.fillStyle = COL.wall; ctx.fillRect(x, y, TILE, TILE);
    const h = hash(tx, ty);
    ctx.fillStyle = COL.wallLo;
    ctx.fillRect(x + (h % 18) + 3, y + ((h >> 5) % 18) + 3, 6, 3);
    ctx.fillRect(x + ((h >> 9) % 20) + 2, y + ((h >> 3) % 20) + 4, 4, 2);
    const up = tileChar(L, tx, ty - 1);
    if (up !== '#' && !inRing(L, tx, ty - 1)) { ctx.fillStyle = COL.wallHi; ctx.fillRect(x, y, TILE, 3); }
    ctx.strokeStyle = 'rgba(8,10,24,0.55)'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
  }

  function drawDoor(L, d, time) {
    const x = d.tx * TILE, y = d.ty * TILE, col = DOOR[d.ch], open = L.doorOpen[d.ch];
    if (open) {
      ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([4, 5]);
      rr(x + 5, y + 1, TILE - 10, TILE - 2, 4); ctx.stroke(); ctx.restore();
      return;
    }
    ctx.fillStyle = '#12162b'; rr(x + 3, y, TILE - 6, TILE, 3); ctx.fill();
    ctx.fillStyle = col; rr(x + 5, y + 1, TILE - 10, TILE - 2, 3); ctx.fill();
    ctx.save(); rr(x + 5, y + 1, TILE - 10, TILE - 2, 3); ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let k = 0; k < 3; k++) ctx.fillRect(x + 5, y + 6 + k * 10, TILE - 10, 3);
    ctx.restore();
  }

  function drawPlate(p, time) {
    const x = p.tx * TILE, y = p.ty * TILE, col = DOOR[p.door];
    if (p.kind === 'human') {
      const hgt = p.pressed ? 3 : 7;
      ctx.fillStyle = '#12162b'; rr(x + 2, y + TILE - 10, TILE - 4, 10, 3); ctx.fill();
      ctx.fillStyle = col; rr(x + 5, y + TILE - 3 - hgt, TILE - 10, hgt, 2); ctx.fill();
      if (p.pressed) { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = col; ctx.fillRect(x + 5, y + 4, TILE - 10, TILE - 10); ctx.restore(); }
    } else {
      const cx = x + TILE / 2, cy = y + TILE / 2 + Math.sin(time * 2 + p.tx) * 1.5;
      ctx.save();
      ctx.shadowColor = col; ctx.shadowBlur = p.pressed ? 18 : 8;
      ctx.strokeStyle = col; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, 6.3); ctx.stroke();
      ctx.fillStyle = col; ctx.globalAlpha = p.pressed ? 0.9 : 0.35;
      ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 5, cy); ctx.lineTo(cx, cy + 6); ctx.lineTo(cx - 5, cy); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  function drawSpike(s) {
    const x = s.tx * TILE, y = s.ty * TILE, n = 3, w = TILE / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = COL.danger;
      ctx.beginPath(); ctx.moveTo(x + i * w + 1, y + TILE); ctx.lineTo(x + i * w + w / 2, y + TILE - 17); ctx.lineTo(x + (i + 1) * w - 1, y + TILE); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.moveTo(x + i * w + w / 2, y + TILE - 17); ctx.lineTo(x + i * w + w / 2 + 2, y + TILE - 8); ctx.lineTo(x + i * w + w / 2 - 2, y + TILE - 8); ctx.closePath(); ctx.fill();
    }
  }

  function drawSalt(s, time) {
    const x = s.tx * TILE, y = s.ty * TILE;
    ctx.fillStyle = 'rgba(234,245,248,0.10)'; ctx.fillRect(x + 3, y, TILE - 6, TILE);
    for (let i = 0; i < 6; i++) {
      const h = hash(s.tx * 7 + i, s.ty * 13 + i * 3);
      const px = x + 5 + (h % 22), py = y + 4 + ((h >> 6) % 24), r = 2 + ((h >> 12) % 3);
      ctx.save(); ctx.globalAlpha = 0.55 + 0.4 * Math.sin(time * 3 + h);
      ctx.fillStyle = COL.salt;
      ctx.beginPath(); ctx.moveTo(px, py - r); ctx.lineTo(px + r, py); ctx.lineTo(px, py + r); ctx.lineTo(px - r, py); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  function drawExitH(e, on, time) {
    const x = e.tx * TILE, y = e.ty * TILE;
    ctx.save();
    if (on) { ctx.shadowColor = COL.human; ctx.shadowBlur = 18; }
    const g = ctx.createLinearGradient(0, y, 0, y + TILE);
    g.addColorStop(0, on ? '#ffd9a6' : '#f2a65a'); g.addColorStop(1, on ? '#f2a65a' : '#a8662c');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x + 5, y + TILE); ctx.lineTo(x + 5, y + 13); ctx.arc(x + TILE / 2, y + 13, 11, Math.PI, 0); ctx.lineTo(x + TILE - 5, y + TILE); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#120f1c';
    ctx.beginPath(); ctx.moveTo(x + 10, y + TILE); ctx.lineTo(x + 10, y + 14); ctx.arc(x + TILE / 2, y + 14, 6, Math.PI, 0); ctx.lineTo(x + TILE - 10, y + TILE); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawExitG(e, on, time) {
    const cx = e.tx * TILE + TILE / 2, cy = e.ty * TILE + TILE / 2;
    ctx.save();
    ctx.shadowColor = COL.ghost; ctx.shadowBlur = on ? 22 : 10;
    ctx.strokeStyle = COL.ghost; ctx.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      const a = time * (1.4 + i * 0.5) * (i % 2 ? -1 : 1), r = 13 - i * 4;
      ctx.globalAlpha = on ? 1 : 0.75;
      ctx.beginPath(); ctx.arc(cx, cy, r, a, a + 4.2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawBox(b) {
    ctx.fillStyle = '#a97439'; rr(b.x, b.y, b.w, b.h, 3); ctx.fill();
    ctx.strokeStyle = '#6a4522'; ctx.lineWidth = 2; rr(b.x + 1, b.y + 1, b.w - 2, b.h - 2, 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b.x + 4, b.y + 4); ctx.lineTo(b.x + b.w - 4, b.y + b.h - 4); ctx.moveTo(b.x + b.w - 4, b.y + 4); ctx.lineTo(b.x + 4, b.y + b.h - 4); ctx.stroke();
  }

  function drawHuman(hm, time) {
    const { x, y, w, h } = hm;
    const squash = hm.onGround ? 0 : Math.max(-3, Math.min(3, -hm.vy / 220));
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + 1, w / 2, 2.5, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = COL.human; rr(x - squash / 2, y + squash, w + squash, h - squash, 9); ctx.fill();
    ctx.fillStyle = '#3a2410'; rr(x + 3 + (hm.face > 0 ? 2 : 0), y + 5 + squash, w - 8, 11, 5); ctx.fill();
    ctx.fillStyle = '#fff';
    const ex = x + w / 2 + hm.face * 3;
    ctx.beginPath(); ctx.arc(ex - 3, y + 10 + squash, 1.8, 0, 6.3); ctx.arc(ex + 3, y + 10 + squash, 1.8, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#7a4a1e';
    const step = hm.onGround && hm.vx ? Math.sin(time * 18) * 2 : 0;
    ctx.fillRect(x + 4, y + h - 3, 6, 3 + step * 0.5); ctx.fillRect(x + w - 10, y + h - 3, 6, 3 - step * 0.5);
  }

  function drawGhost(L, gh, time) {
    const cx = gh.x + gh.w / 2, cy = gh.y + gh.h / 2 + Math.sin(time * 3) * 1.6, r = 13;
    const tx = Math.floor(cx / TILE), ty = Math.floor(cy / TILE);
    const inWall = tileChar(L, tx, ty) === '#' && !inRing(L, tx, ty);
    ctx.save();
    ctx.globalAlpha = inWall ? 0.6 : 0.95;
    ctx.shadowColor = COL.ghost; ctx.shadowBlur = 16;
    ctx.fillStyle = '#e9fffb';
    ctx.beginPath();
    ctx.moveTo(cx - r, cy + r); ctx.lineTo(cx - r, cy); ctx.arc(cx, cy, r, Math.PI, 0); ctx.lineTo(cx + r, cy + r);
    const n = 3, sw = 2 * r / n;
    for (let i = 0; i < n; i++) ctx.quadraticCurveTo(cx + r - sw * (i + 0.5), cy + r - 7, cx + r - sw * (i + 1), cy + r);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#12313a';
    const ex = gh.face * 2;
    ctx.beginPath(); ctx.ellipse(cx - 4 + ex, cy - 2, 2.2, 3, 0, 0, 6.3); ctx.ellipse(cx + 4 + ex, cy - 2, 2.2, 3, 0, 0, 6.3); ctx.fill();
    ctx.restore();
  }

  function draw(G, time) {
    const L = G.L;
    if (!L) return;
    ctx.setTransform(canvas.width / (L.w * TILE), 0, 0, canvas.height / (L.h * TILE), 0, 0);
    drawBackground(L);
    for (let ty = 0; ty < L.h; ty++) for (let tx = 0; tx < L.w; tx++) {
      const c = L.grid[ty][tx];
      if (inRing(L, tx, ty) || c === 'L') drawLead(tx * TILE, ty * TILE);
      else if (c === '#') drawWall(L, tx, ty);
    }
    for (const s of L.salts) drawSalt(s, time);
    for (const p of L.plates) drawPlate(p, time);
    drawExitH(L.exitH, L.atH, time);
    drawExitG(L.exitG, L.atG, time);
    for (const d of L.doorTiles) drawDoor(L, d, time);
    for (const s of L.spikes) drawSpike(s);
    for (const b of L.boxes) drawBox(b);
    drawGhost(L, L.gh, time);
    drawHuman(L.hm, time);
    for (const p of G.parts) {
      ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.3); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (G.state === 'dead') {
      ctx.fillStyle = 'rgba(239,90,103,' + Math.min(0.28, G.deadT * 0.5) + ')';
      ctx.fillRect(0, 0, L.w * TILE, L.h * TILE);
    }
  }

  return { init, fit, draw };
})();
