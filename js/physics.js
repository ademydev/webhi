/* Hareket, yer çekimi, çarpışma, düğme/kapı mantığı ve tehlikeler. */
const GRAV = 1800;
const JUMP_V = 580;      // yaklaşık 2.9 kare yükseklik
const RUN = 190;
const GHOST_SPEED = 165;
const MAX_FALL = 820;

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function inRing(L, tx, ty) { return tx <= 0 || ty <= 0 || tx >= L.w - 1 || ty >= L.h - 1; }

function tileChar(L, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= L.w || ty >= L.h) return 'L';
  return L.grid[ty][tx];
}

function solidFor(L, kind, tx, ty) {
  const c = tileChar(L, tx, ty);
  if (c === 'L') return true;
  if (DOORS.includes(c)) return !L.doorOpen[c];
  if (inRing(L, tx, ty)) return true;
  return kind === 'human' && c === '#';
}

function tileMoveX(L, b, dx, kind) {
  if (!dx) return false;
  b.x += dx;
  let hit = false;
  const y0 = Math.floor(b.y / TILE), y1 = Math.floor((b.y + b.h - 0.001) / TILE);
  const x0 = Math.floor(b.x / TILE), x1 = Math.floor((b.x + b.w - 0.001) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (solidFor(L, kind, tx, ty)) {
      if (dx > 0) b.x = tx * TILE - b.w; else b.x = (tx + 1) * TILE;
      hit = true;
    }
  }
  return hit;
}

function tileMoveY(L, b, dy, kind) {
  if (!dy) return false;
  b.y += dy;
  let hit = false;
  const y0 = Math.floor(b.y / TILE), y1 = Math.floor((b.y + b.h - 0.001) / TILE);
  const x0 = Math.floor(b.x / TILE), x1 = Math.floor((b.x + b.w - 0.001) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (solidFor(L, kind, tx, ty)) {
      if (dy > 0) b.y = ty * TILE - b.h; else b.y = (ty + 1) * TILE;
      hit = true;
    }
  }
  return hit;
}

function boxMoveX(L, box, dx) {
  const start = box.x;
  tileMoveX(L, box, dx, 'human');
  for (const o of L.boxes) {
    if (o !== box && overlap(box, o)) box.x = dx > 0 ? o.x - box.w : o.x + o.w;
  }
  return box.x - start;
}

function humanMoveX(L, hm, dx) {
  if (!dx) return;
  tileMoveX(L, hm, dx, 'human');
  for (const bx of L.boxes) {
    if (!overlap(hm, bx)) continue;
    const push = dx > 0 ? (hm.x + hm.w) - bx.x : -((bx.x + bx.w) - hm.x);
    const moved = boxMoveX(L, bx, push);
    hm.x -= (push - moved);
  }
}

function humanMoveY(L, hm, dy) {
  hm.onGround = false;
  const hit = tileMoveY(L, hm, dy, 'human');
  let landed = hit && dy > 0;
  if (hit) hm.vy = 0;
  for (const bx of L.boxes) {
    if (!overlap(hm, bx)) continue;
    if (dy >= 0) { hm.y = bx.y - hm.h; landed = true; hm.vy = 0; }
    else { hm.y = bx.y + bx.h; hm.vy = 0; }
  }
  if (landed) hm.onGround = true;
}

function boxStep(L, box, dt) {
  box.vy = Math.min(box.vy + GRAV * dt, MAX_FALL);
  const hit = tileMoveY(L, box, box.vy * dt, 'human');
  if (hit) box.vy = 0;
  for (const o of L.boxes) {
    if (o !== box && overlap(box, o)) { box.y = o.y - box.h; box.vy = 0; }
  }
  if (overlap(box, L.hm) && box.vy > 0) { box.y = L.hm.y - box.h; box.vy = 0; }
}

function updateDoors(L) {
  const pressed = {};
  for (const p of L.plates) {
    let on = false;
    if (p.kind === 'human') {
      const r = { x: p.tx * TILE + 4, y: p.ty * TILE + 18, w: TILE - 8, h: 14 };
      on = overlap(r, L.hm) || L.boxes.some(b => overlap(r, b));
    } else {
      const r = { x: p.tx * TILE + 4, y: p.ty * TILE + 4, w: TILE - 8, h: TILE - 8 };
      on = overlap(r, L.gh);
    }
    p.pressed = on;
    if (on) pressed[p.door] = true;
  }
  const hold = {};
  for (const d of L.doorTiles) {
    const r = { x: d.tx * TILE, y: d.ty * TILE, w: TILE, h: TILE };
    if (overlap(r, L.hm) || overlap(r, L.gh) || L.boxes.some(b => overlap(r, b))) hold[d.ch] = true;
  }
  for (const d of DOORS) L.doorOpen[d] = !!(pressed[d] || hold[d]);
}

/* Bir fizik adımı. Ölüm olursa { dead: 'human' | 'ghost' } döndürür. */
function stepLevel(L, input, dt) {
  updateDoors(L);
  const hm = L.hm, gh = L.gh;

  // İnsan
  const left = input.held('hLeft') ? 1 : 0, right = input.held('hRight') ? 1 : 0;
  hm.vx = (right - left) * RUN;
  if (hm.vx) hm.face = hm.vx > 0 ? 1 : -1;
  const jumpHeld = input.held('hJump');
  if (jumpHeld && !hm.prevJump) hm.jumpBuf = 0.12;
  hm.prevJump = jumpHeld;
  hm.jumpBuf -= dt;
  if (hm.onGround) hm.coyote = 0.09; else hm.coyote -= dt;
  if (hm.jumpBuf > 0 && hm.coyote > 0) { hm.vy = -JUMP_V; hm.jumpBuf = 0; hm.coyote = 0; hm.onGround = false; }
  humanMoveX(L, hm, hm.vx * dt);
  hm.vy = Math.min(hm.vy + GRAV * dt, MAX_FALL);
  humanMoveY(L, hm, hm.vy * dt);

  // Hayalet
  let gx = (input.held('gRight') ? 1 : 0) - (input.held('gLeft') ? 1 : 0);
  let gy = (input.held('gDown') ? 1 : 0) - (input.held('gUp') ? 1 : 0);
  if (gx && gy) { gx *= Math.SQRT1_2; gy *= Math.SQRT1_2; }
  if (gx) gh.face = gx > 0 ? 1 : -1;
  tileMoveX(L, gh, gx * GHOST_SPEED * dt, 'ghost');
  tileMoveY(L, gh, gy * GHOST_SPEED * dt, 'ghost');

  // Kutular
  for (const b of L.boxes) boxStep(L, b, dt);

  // Tehlikeler
  for (const s of L.spikes) {
    const r = { x: s.tx * TILE + 6, y: s.ty * TILE + 16, w: TILE - 12, h: TILE - 16 };
    if (overlap(r, hm)) return { dead: 'human' };
  }
  for (const s of L.salts) {
    const r = { x: s.tx * TILE + 5, y: s.ty * TILE + 5, w: TILE - 10, h: TILE - 10 };
    if (overlap(r, gh)) return { dead: 'ghost' };
  }

  // Çıkışlar
  const eh = L.exitH, eg = L.exitG;
  L.atH = overlap({ x: eh.tx * TILE + 6, y: eh.ty * TILE + 2, w: TILE - 12, h: TILE - 2 }, hm);
  L.atG = overlap({ x: eg.tx * TILE + 5, y: eg.ty * TILE + 5, w: TILE - 10, h: TILE - 10 }, gh);
  return null;
}
