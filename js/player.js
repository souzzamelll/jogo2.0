// Player Controller, Physics & Rendering

const SKINS = {
  cyan: {
    id: 'cyan',
    name: 'Neon Ciano',
    primary: '#00f0ff',
    secondary: '#ffffff',
    glow: 'rgba(0, 240, 255, 0.7)',
    reqPoints: 0,
    desc: 'Padrão'
  },
  gold: {
    id: 'gold',
    name: 'Sol Dourado',
    primary: '#ffbe0b',
    secondary: '#ffffff',
    glow: 'rgba(255, 190, 11, 0.8)',
    reqPoints: 2500,
    desc: '2.500 pts'
  },
  violet: {
    id: 'violet',
    name: 'Vortex Violeta',
    primary: '#b5179e',
    secondary: '#e0aaff',
    glow: 'rgba(181, 23, 158, 0.8)',
    reqPoints: 6000,
    desc: '6.000 pts'
  },
  carmine: {
    id: 'carmine',
    name: 'Hiper Carmim',
    primary: '#ff0055',
    secondary: '#ff99b3',
    glow: 'rgba(255, 0, 85, 0.85)',
    reqPoints: 12000,
    desc: '12.000 pts'
  },
  prism: {
    id: 'prism',
    name: 'Prisma Glitch',
    primary: '#00ffcc',
    secondary: '#ffffff',
    glow: 'rgba(0, 255, 204, 0.85)',
    reqPoints: 25000,
    desc: '25.000 pts'
  }
};

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 11;
    this.grazeRadius = 28;

    // Movement physics
    this.maxSpeed = 6.8;
    this.acceleration = 1.1;
    this.friction = 0.88;

    // Controls state
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false
    };
    this.mouseTarget = null;
    this.lastInputSource = 'none'; // 'keyboard', 'mouse', 'touch'

    // Trail
    this.trail = [];
    this.trailInterval = 0;

    // Power-up & defense statuses
    this.hasShield = false;
    this.magnetTimer = 0;
    this.invulnerableTimer = 0;

    // Active skin
    const savedSkin = localStorage.getItem('vertice_skin') || 'cyan';
    this.skin = SKINS[savedSkin] || SKINS.cyan;
    this.pulseAngle = 0;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.trail = [];
    this.hasShield = false;
    this.magnetTimer = 0;
    this.invulnerableTimer = 0;
    this.mouseTarget = null;
  }

  setSkin(skinId) {
    if (SKINS[skinId]) {
      this.skin = SKINS[skinId];
      localStorage.setItem('vertice_skin', skinId);
    }
  }

  handleKeyDown(code) {
    let keyHandled = false;
    if (code === 'KeyW' || code === 'ArrowUp') { this.keys.up = true; keyHandled = true; }
    if (code === 'KeyS' || code === 'ArrowDown') { this.keys.down = true; keyHandled = true; }
    if (code === 'KeyA' || code === 'ArrowLeft') { this.keys.left = true; keyHandled = true; }
    if (code === 'KeyD' || code === 'ArrowRight') { this.keys.right = true; keyHandled = true; }

    if (keyHandled) {
      this.lastInputSource = 'keyboard';
      this.mouseTarget = null; // Keyboard takes over until mouse moves
    }
  }

  handleKeyUp(code) {
    if (code === 'KeyW' || code === 'ArrowUp') this.keys.up = false;
    if (code === 'KeyS' || code === 'ArrowDown') this.keys.down = false;
    if (code === 'KeyA' || code === 'ArrowLeft') this.keys.left = false;
    if (code === 'KeyD' || code === 'ArrowRight') this.keys.right = false;
  }

  handlePointerMove(targetX, targetY) {
    this.mouseTarget = { x: targetX, y: targetY };
    this.lastInputSource = 'mouse';
  }

  update(dt, arenaWidth, arenaHeight, particleSystem) {
    this.pulseAngle += dt * 6;

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }
    if (this.magnetTimer > 0) {
      this.magnetTimer -= dt;
    }

    // Input processing
    let ax = 0;
    let ay = 0;

    if (this.lastInputSource === 'mouse' && this.mouseTarget) {
      // Smooth mouse follow
      const dx = this.mouseTarget.x - this.x;
      const dy = this.mouseTarget.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 3) {
        const speed = Math.min(this.maxSpeed, dist * 0.22);
        this.vx = (dx / dist) * speed;
        this.vy = (dy / dist) * speed;
      } else {
        this.vx *= 0.5;
        this.vy *= 0.5;
      }
    } else {
      // Keyboard movement
      if (this.keys.up) ay -= 1;
      if (this.keys.down) ay += 1;
      if (this.keys.left) ax -= 1;
      if (this.keys.right) ax += 1;

      // Normalize diagonal
      if (ax !== 0 && ay !== 0) {
        ax *= 0.7071;
        ay *= 0.7071;
      }

      this.vx += ax * this.acceleration;
      this.vy += ay * this.acceleration;

      // Friction & speed clamp
      this.vx *= this.friction;
      this.vy *= this.friction;

      const currentSpeed = Math.hypot(this.vx, this.vy);
      if (currentSpeed > this.maxSpeed) {
        this.vx = (this.vx / currentSpeed) * this.maxSpeed;
        this.vy = (this.vy / currentSpeed) * this.maxSpeed;
      }
    }

    // Position integration
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    // Arena boundary collision
    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx = 0;
    } else if (this.x + this.radius > arenaWidth) {
      this.x = arenaWidth - this.radius;
      this.vx = 0;
    }

    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.vy = 0;
    } else if (this.y + this.radius > arenaHeight) {
      this.y = arenaHeight - this.radius;
      this.vy = 0;
    }

    // Particle Trail recording
    this.trailInterval += dt;
    if (this.trailInterval >= 0.035) {
      this.trailInterval = 0;
      this.trail.unshift({ x: this.x, y: this.y });
      if (this.trail.length > 8) this.trail.pop();
    }
  }

  draw(ctx) {
    ctx.save();

    // Blinking during invulnerability
    if (this.invulnerableTimer > 0 && Math.sin(this.invulnerableTimer * 30) > 0) {
      ctx.globalAlpha = 0.35;
    }

    // 1. Draw Trail
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const progress = 1 - (i / this.trail.length);
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * progress * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = this.skin.glow.replace('0.7', (progress * 0.25).toString());
      ctx.fill();
    }

    // 2. Faint Graze Boundary Indicator
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.grazeRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.setLineDash([3, 5]);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Magnet field ring (if active)
    if (this.magnetTimer > 0) {
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.grazeRadius + 14 + Math.sin(this.pulseAngle * 2) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 4. Quantum Shield (if active)
    if (this.hasShield) {
      ctx.shadowColor = '#10e796';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = '#10e796';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 6 + Math.sin(this.pulseAngle) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. Player Core
    let primaryColor = this.skin.primary;
    if (this.skin.id === 'prism') {
      const hue = (Date.now() / 15) % 360;
      primaryColor = `hsl(${hue}, 100%, 65%)`;
    }

    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 16;
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Hot center core
    ctx.fillStyle = this.skin.secondary;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

window.Player = Player;
window.SKINS = SKINS;
