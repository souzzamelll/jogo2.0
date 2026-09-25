// Hazards & Obstacle Architecture

// Base Hazard Class
class Hazard {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.grazeRadius = radius + 22; // Graze detection zone
    this.hasGrazed = false; // Only graze once per approach
    this.isDead = false;
  }

  update(dt, arenaWidth, arenaHeight, speedMultiplier = 1) {}
  draw(ctx) {}
}

// 1. Kinetic Bouncer Orb
class KineticBouncer extends Hazard {
  constructor(x, y, vx, vy, radius = 12) {
    super(x, y, radius);
    this.vx = vx;
    this.vy = vy;
    this.color = '#ff2a5f';
    this.pulse = 0;
    this.trail = [];
  }

  update(dt, arenaWidth, arenaHeight, speedMultiplier = 1) {
    this.pulse += dt * 5;

    // Movement
    this.x += this.vx * speedMultiplier * dt * 60;
    this.y += this.vy * speedMultiplier * dt * 60;

    // Boundary bounce
    if (this.x - this.radius < 0) {
      this.x = this.radius;
      this.vx = Math.abs(this.vx);
      this.hasGrazed = false;
    } else if (this.x + this.radius > arenaWidth) {
      this.x = arenaWidth - this.radius;
      this.vx = -Math.abs(this.vx);
      this.hasGrazed = false;
    }

    if (this.y - this.radius < 0) {
      this.y = this.radius;
      this.vy = Math.abs(this.vy);
      this.hasGrazed = false;
    } else if (this.y + this.radius > arenaHeight) {
      this.y = arenaHeight - this.radius;
      this.vy = -Math.abs(this.vy);
      this.hasGrazed = false;
    }

    // Trail records
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 5) this.trail.pop();
  }

  draw(ctx) {
    // Faint trail
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const alpha = (1 - i / this.trail.length) * 0.3;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * (1 - i * 0.12), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 42, 95, ${alpha})`;
      ctx.fill();
    }

    // Core Hazard
    ctx.save();
    ctx.shadowColor = '#ff2a5f';
    ctx.shadowBlur = 12;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Hot inner core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// 2. Telegraphed Sweeping Laser Beam
class LaserHazard extends Hazard {
  constructor(orientation, position, arenaWidth, arenaHeight) {
    super(0, 0, 0);
    this.orientation = orientation; // 'horizontal' or 'vertical'
    this.pos = position; // Y for horizontal, X for vertical
    this.arenaWidth = arenaWidth;
    this.arenaHeight = arenaHeight;

    this.state = 'warning'; // 'warning' -> 'firing' -> 'fading'
    this.timer = 0;
    this.warningDuration = 1.1; // seconds before firing
    this.fireDuration = 0.65;    // seconds active
    this.fadeDuration = 0.25;

    this.beamThickness = 22;
    this.warningBeeped = false;
    this.firedSound = false;
  }

  update(dt, arenaWidth, arenaHeight, speedMultiplier = 1) {
    this.timer += dt;

    if (this.state === 'warning') {
      if (!this.warningBeeped) {
        window.soundManager.playLaserTelegraph();
        this.warningBeeped = true;
      }
      if (this.timer >= this.warningDuration) {
        this.state = 'firing';
        this.timer = 0;
        if (!this.firedSound) {
          window.soundManager.playLaserFire();
          this.firedSound = true;
        }
      }
    } else if (this.state === 'firing') {
      if (this.timer >= this.fireDuration) {
        this.state = 'fading';
        this.timer = 0;
      }
    } else if (this.state === 'fading') {
      if (this.timer >= this.fadeDuration) {
        this.isDead = true;
      }
    }
  }

  // Check collision with player
  checkPlayer(player) {
    if (this.state !== 'firing') return { hit: false, graze: false };

    const halfThick = this.beamThickness / 2;
    const grazeExtra = 26;

    if (this.orientation === 'horizontal') {
      const dist = Math.abs(player.y - this.pos);
      if (dist <= player.radius + halfThick) {
        return { hit: true, graze: false };
      } else if (dist <= player.radius + halfThick + grazeExtra && !this.hasGrazed) {
        this.hasGrazed = true;
        return { hit: false, graze: true };
      }
    } else {
      const dist = Math.abs(player.x - this.pos);
      if (dist <= player.radius + halfThick) {
        return { hit: true, graze: false };
      } else if (dist <= player.radius + halfThick + grazeExtra && !this.hasGrazed) {
        this.hasGrazed = true;
        return { hit: false, graze: true };
      }
    }

    return { hit: false, graze: false };
  }

  draw(ctx) {
    ctx.save();

    if (this.state === 'warning') {
      // Telegraph line: blinking red dashed line
      const blink = Math.sin(this.timer * 22) > 0;
      ctx.strokeStyle = blink ? 'rgba(255, 42, 95, 0.85)' : 'rgba(255, 42, 95, 0.25)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);

      ctx.beginPath();
      if (this.orientation === 'horizontal') {
        ctx.moveTo(0, this.pos);
        ctx.lineTo(this.arenaWidth, this.pos);
      } else {
        ctx.moveTo(this.pos, 0);
        ctx.lineTo(this.pos, this.arenaHeight);
      }
      ctx.stroke();

      // Warning chevron markers on edges
      ctx.fillStyle = '#ff2a5f';
      if (this.orientation === 'horizontal') {
        ctx.fillRect(4, this.pos - 5, 8, 10);
        ctx.fillRect(this.arenaWidth - 12, this.pos - 5, 8, 10);
      } else {
        ctx.fillRect(this.pos - 5, 4, 10, 8);
        ctx.fillRect(this.pos - 5, this.arenaHeight - 12, 10, 8);
      }

    } else if (this.state === 'firing') {
      // Intense neon laser beam
      const currentThickness = this.beamThickness * (1 + Math.sin(this.timer * 35) * 0.1);

      ctx.shadowColor = '#ff2a5f';
      ctx.shadowBlur = 24;

      // Outer glow
      ctx.fillStyle = 'rgba(255, 42, 95, 0.4)';
      if (this.orientation === 'horizontal') {
        ctx.fillRect(0, this.pos - currentThickness, this.arenaWidth, currentThickness * 2);
      } else {
        ctx.fillRect(this.pos - currentThickness, 0, currentThickness * 2, this.arenaHeight);
      }

      // Hot laser beam
      ctx.fillStyle = 'rgba(255, 42, 95, 0.95)';
      if (this.orientation === 'horizontal') {
        ctx.fillRect(0, this.pos - currentThickness / 2, this.arenaWidth, currentThickness);
      } else {
        ctx.fillRect(this.pos - currentThickness / 2, 0, currentThickness, this.arenaHeight);
      }

      // Ultra-hot white core
      ctx.fillStyle = '#ffffff';
      if (this.orientation === 'horizontal') {
        ctx.fillRect(0, this.pos - 3, this.arenaWidth, 6);
      } else {
        ctx.fillRect(this.pos - 3, 0, 6, this.arenaHeight);
      }

    } else if (this.state === 'fading') {
      const alpha = 1 - (this.timer / this.fadeDuration);
      ctx.fillStyle = `rgba(255, 42, 95, ${alpha * 0.5})`;
      if (this.orientation === 'horizontal') {
        ctx.fillRect(0, this.pos - this.beamThickness / 4, this.arenaWidth, this.beamThickness / 2);
      } else {
        ctx.fillRect(this.pos - this.beamThickness / 4, 0, this.beamThickness / 2, this.arenaHeight);
      }
    }

    ctx.restore();
  }
}

// 3. Seeker Drone (Slow homing mine with finite lifespan)
class SeekerDrone extends Hazard {
  constructor(x, y, radius = 10) {
    super(x, y, radius);
    this.vx = 0;
    this.vy = 0;
    this.speed = 1.6;
    this.lifespan = 8.5; // Seconds alive
    this.age = 0;
    this.rotation = 0;
  }

  update(dt, arenaWidth, arenaHeight, speedMultiplier = 1, playerPos = null) {
    this.age += dt;
    this.rotation += dt * 3;

    if (this.age >= this.lifespan) {
      this.isDead = true;
      return;
    }

    if (playerPos) {
      const dx = playerPos.x - this.x;
      const dy = playerPos.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;

      const targetVx = (dx / dist) * this.speed * speedMultiplier;
      const targetVy = (dy / dist) * this.speed * speedMultiplier;

      // Smooth steering
      this.vx += (targetVx - this.vx) * 0.05;
      this.vy += (targetVy - this.vy) * 0.05;
    }

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    // Keep within bounds
    this.x = Math.max(this.radius, Math.min(arenaWidth - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(arenaHeight - this.radius, this.y));
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Flashing warning if nearing self-destruct
    const isExhausting = (this.lifespan - this.age) < 2.0;
    const color = isExhausting && Math.sin(this.age * 18) > 0 ? '#ffbe0b' : '#ff0055';

    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;

    // Diamond rotating core
    ctx.beginPath();
    ctx.moveTo(0, -this.radius * 1.3);
    ctx.lineTo(this.radius * 1.3, 0);
    ctx.lineTo(0, this.radius * 1.3);
    ctx.lineTo(-this.radius * 1.3, 0);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// Hazard Director & Manager
class HazardManager {
  constructor() {
    this.hazards = [];
    this.laserQueue = [];
    this.laserTimer = 0;
    this.seekerTimer = 0;
  }

  clear() {
    this.hazards = [];
    this.laserQueue = [];
    this.laserTimer = 0;
    this.seekerTimer = 0;
  }

  // Wipe hazards during shield break or cleansing pulse
  clearNearby(x, y, radius) {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      if (h instanceof KineticBouncer || h instanceof SeekerDrone) {
        const dist = Math.hypot(h.x - x, h.y - y);
        if (dist <= radius) {
          h.isDead = true;
        }
      }
    }
  }

  spawnBouncer(arenaWidth, arenaHeight, speed) {
    // Spawn from edge
    const side = Math.floor(Math.random() * 4);
    let x, y, vx, vy;

    if (side === 0) { // Top
      x = Math.random() * arenaWidth;
      y = 15;
      vx = (Math.random() - 0.5) * speed;
      vy = Math.random() * speed * 0.7 + 1.2;
    } else if (side === 1) { // Right
      x = arenaWidth - 15;
      y = Math.random() * arenaHeight;
      vx = -(Math.random() * speed * 0.7 + 1.2);
      vy = (Math.random() - 0.5) * speed;
    } else if (side === 2) { // Bottom
      x = Math.random() * arenaWidth;
      y = arenaHeight - 15;
      vx = (Math.random() - 0.5) * speed;
      vy = -(Math.random() * speed * 0.7 + 1.2);
    } else { // Left
      x = 15;
      y = Math.random() * arenaHeight;
      vx = Math.random() * speed * 0.7 + 1.2;
      vy = (Math.random() - 0.5) * speed;
    }

    this.hazards.push(new KineticBouncer(x, y, vx, vy, 11 + Math.random() * 3));
  }

  spawnLaser(arenaWidth, arenaHeight) {
    const orientation = Math.random() > 0.5 ? 'horizontal' : 'vertical';
    const margin = 50;
    let pos;
    if (orientation === 'horizontal') {
      pos = margin + Math.random() * (arenaHeight - margin * 2);
    } else {
      pos = margin + Math.random() * (arenaWidth - margin * 2);
    }

    this.hazards.push(new LaserHazard(orientation, pos, arenaWidth, arenaHeight));
  }

  spawnSeeker(arenaWidth, arenaHeight) {
    const x = Math.random() > 0.5 ? 20 : arenaWidth - 20;
    const y = Math.random() * arenaHeight;
    this.hazards.push(new SeekerDrone(x, y, 9));
  }

  update(dt, arenaWidth, arenaHeight, speedMultiplier, player, particleSystem, game) {
    // Update hazards
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];

      if (h instanceof SeekerDrone) {
        h.update(dt, arenaWidth, arenaHeight, speedMultiplier, { x: player.x, y: player.y });
      } else {
        h.update(dt, arenaWidth, arenaHeight, speedMultiplier);
      }

      // Check collision
      if (h instanceof LaserHazard) {
        const res = h.checkPlayer(player);
        if (res.hit) {
          game.handlePlayerHit(player);
        } else if (res.graze) {
          game.handleGraze(player.x, player.y);
        }
      } else {
        // Circle vs Circle
        const dx = player.x - h.x;
        const dy = player.y - h.y;
        const dist = Math.hypot(dx, dy);

        // Lethal hit
        if (dist <= player.radius + h.radius) {
          game.handlePlayerHit(player);
        } else if (dist <= player.radius + h.grazeRadius) {
          // Graze
          if (!h.hasGrazed) {
            h.hasGrazed = true;
            game.handleGraze(player.x, player.y);
          }
        } else if (dist > player.radius + h.grazeRadius + 20) {
          // Reset graze if player flew far away
          h.hasGrazed = false;
        }
      }

      if (h.isDead) {
        if (h instanceof SeekerDrone) {
          particleSystem.emitCollect(h.x, h.y, '#ffbe0b', 8);
        }
        this.hazards.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.hazards.length; i++) {
      this.hazards[i].draw(ctx);
    }
  }
}

window.HazardManager = HazardManager;
