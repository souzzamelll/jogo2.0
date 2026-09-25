// High-performance particle engine and floating combat text

class Particle {
  constructor(x, y, vx, vy, color, size, life, decay, shape = 'circle', alpha = 1) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.baseSize = size;
    this.life = life;
    this.maxLife = life;
    this.decay = decay;
    this.shape = shape; // 'circle', 'square', 'ring'
    this.alpha = alpha;
  }

  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.life -= this.decay * dt * 60;

    const progress = Math.max(0, this.life / this.maxLife);
    if (this.shape === 'ring') {
      this.size = this.baseSize * (2 - progress);
    } else {
      this.size = this.baseSize * progress;
    }
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const progress = Math.max(0, this.life / this.maxLife);
    const alpha = this.alpha * progress;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = this.color;

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(0.5, this.size), 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'square') {
      const s = Math.max(1, this.size);
      ctx.fillRect(this.x - s / 2, this.y - s / 2, s, s);
    } else if (this.shape === 'ring') {
      ctx.lineWidth = 2 * progress;
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(1, this.size), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

class FloatingText {
  constructor(x, y, text, color, fontSize = 16, duration = 1.0, isCritical = false) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.fontSize = fontSize;
    this.life = duration;
    this.maxLife = duration;
    this.vy = -1.2;
    this.isCritical = isCritical;
  }

  update(dt) {
    this.y += this.vy * dt * 60;
    this.life -= dt;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    const progress = Math.max(0, this.life / this.maxLife);

    ctx.save();
    ctx.globalAlpha = Math.min(1, progress * 1.5);
    ctx.font = `800 ${this.fontSize}px 'Outfit', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (this.isCritical) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
    }

    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
  }

  clear() {
    this.particles = [];
    this.floatingTexts = [];
  }

  // Regular item collect burst
  emitCollect(x, y, color = '#ffd000', count = 14) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 3 + Math.random() * 3;
      const life = 18 + Math.random() * 12;
      const decay = 1;
      this.particles.push(new Particle(x, y, vx, vy, color, size, life, decay, 'circle'));
    }
    // Ring shockwave
    this.particles.push(new Particle(x, y, 0, 0, color, 8, 22, 1, 'ring', 0.8));
  }

  // Graze / Near Miss ripple
  emitGraze(x, y, color = '#ffffff') {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, 2, 14, 1, 'circle', 0.9));
    }
    this.particles.push(new Particle(x, y, 0, 0, color, 14, 16, 1, 'ring', 0.7));
  }

  // Player explosion
  emitExplosion(x, y, color = '#ff2a5f', count = 35) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 3 + Math.random() * 5;
      const shape = Math.random() > 0.5 ? 'circle' : 'square';
      this.particles.push(new Particle(x, y, vx, vy, color, size, 30 + Math.random() * 20, 1, shape));
    }
    this.particles.push(new Particle(x, y, 0, 0, color, 10, 30, 0.8, 'ring', 1));
  }

  // Shield break pulse
  emitShieldBreak(x, y) {
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 / 24) * i;
      const speed = 4;
      this.particles.push(new Particle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, '#00f0ff', 4, 25, 1, 'square'));
    }
    this.particles.push(new Particle(x, y, 0, 0, '#00f0ff', 12, 28, 0.8, 'ring', 1));
  }

  // Floating text
  addText(x, y, text, color = '#ffffff', fontSize = 16, isCritical = false) {
    this.floatingTexts.push(new FloatingText(x, y, text, color, fontSize, 0.85, isCritical));
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.update(dt);
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }
    for (let i = 0; i < this.floatingTexts.length; i++) {
      this.floatingTexts[i].draw(ctx);
    }
  }
}

window.ParticleSystem = ParticleSystem;
