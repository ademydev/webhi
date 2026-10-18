/* Bölüm verisini oyun nesnelerine çevirir: kutular, düğmeler, kapılar, çıkışlar, tehlikeler. */
const TILE = 32;
const HUMAN_PLATES = 'abc';
const GHOST_PLATES = 'xyz';
const DOORS = 'ABCXYZ';

const HUMAN_SIZE = { w: 22, h: 28 };
const GHOST_SIZE = { w: 22, h: 22 };
const BOX_SIZE = 28;

function parseLevel(def) {
  const rows = def.map;
  const h = rows.length;
  const w = Math.max(...rows.map(r => r.length));
  const L = {
    name: def.name, hint: def.hint || '',
    w, h, grid: [],
    hm: null, gh: null, boxes: [], plates: [], doorTiles: [],
    spikes: [], salts: [], exitH: null, exitG: null,
    doorOpen: {}, atH: false, atG: false
  };
  for (const d of DOORS) L.doorOpen[d] = false;
  const found = { h: 0, g: 0, e: 0, q: 0 };

  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x] || '#';
      let cell = '.';
      if (ch === '#' || ch === 'L' || ch === '.') cell = ch;
      else if (ch === '^') { cell = '.'; L.spikes.push({ tx: x, ty: y }); }
      else if (ch === '~') { cell = '.'; L.salts.push({ tx: x, ty: y }); }
      else if (DOORS.includes(ch)) { cell = ch; L.doorTiles.push({ tx: x, ty: y, ch }); }
      else if (HUMAN_PLATES.includes(ch)) L.plates.push({ tx: x, ty: y, key: ch, door: ch.toUpperCase(), kind: 'human', pressed: false });
      else if (GHOST_PLATES.includes(ch)) L.plates.push({ tx: x, ty: y, key: ch, door: ch.toUpperCase(), kind: 'ghost', pressed: false });
      else if (ch === 'o') L.boxes.push({ x: x * TILE + (TILE - BOX_SIZE) / 2, y: (y + 1) * TILE - BOX_SIZE, w: BOX_SIZE, h: BOX_SIZE, vy: 0 });
      else if (ch === 'h') { found.h++; L.hm = { x: x * TILE + (TILE - HUMAN_SIZE.w) / 2, y: (y + 1) * TILE - HUMAN_SIZE.h, w: HUMAN_SIZE.w, h: HUMAN_SIZE.h, vx: 0, vy: 0, onGround: false, coyote: 0, jumpBuf: 0, prevJump: false, face: 1 }; }
      else if (ch === 'g') { found.g++; L.gh = { x: x * TILE + (TILE - GHOST_SIZE.w) / 2, y: y * TILE + (TILE - GHOST_SIZE.h) / 2, w: GHOST_SIZE.w, h: GHOST_SIZE.h, face: 1 }; }
      else if (ch === 'e') { found.e++; L.exitH = { tx: x, ty: y }; }
      else if (ch === 'q') { found.q++; L.exitG = { tx: x, ty: y }; }
      else console.warn('Bilinmeyen karakter:', ch, 'satır', y + 1, 'sütun', x + 1, '(', def.name, ')');
      row.push(cell);
    }
    L.grid.push(row);
  }
  for (const k of ['h', 'g', 'e', 'q']) {
    if (found[k] !== 1) throw new Error('"' + def.name + '" bölümünde "' + k + '" karakteri tam 1 kez olmalı, ' + found[k] + ' kez var.');
  }
  return L;
}
