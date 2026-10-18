/* Oyuncu efektleri: ölüm parçacıkları ve karakter renkleri. */
const PlayerFX = {
  colors: { human: '#f2a65a', ghost: '#86e0cf' },
  burst(parts, body, who) {
    const cx = body.x + body.w / 2, cy = body.y + body.h / 2;
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 190;
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, r: 1.5 + Math.random() * 3, life: 0.6, max: 0.6, color: this.colors[who] });
    }
  },
  update(parts, dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt;
      if (p.life <= 0) parts.splice(i, 1);
    }
  }
};
