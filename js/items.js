// Collectibles and Power-Up Items

class Item {
  constructor(x, y, radius, type, value, color) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.type = type; // 'spark', 'prism', 'shield', 'chrono', 'magnet'
    this.value = value;
    this.color = color;
    this.age = 0;
    this.isDead = false;
    this.collected = false;

    // Bobbing & pulse
    this.pulseSpeed = 4;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.lifespan = type === 'prism' ? 8.0 : Infinity;
  }

  update(dt, player, hasMagnetActive) {
    this.age += dt;

    if (this.lifespan !== Infinity && this.age >= this.lifespan) {
      this.isDead = true;
      return;
    }

    // Magnet attraction
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    // Natural pickup or magnet suction
    const magnetRange = hasMagnetActive ? 280 : 35;
    if (dist < magnetRange && dist > 0) {
      const pullSpeed = hasMagnetActive ? 9.0 : 4.0;
      this.x += (dx / dist) * pullSpeed * dt * 60;
      this.y += (dy / dist) * pullSpeed * dt * 60;
    }

    // Collection collision
    if (dist <= player.radius + this.radius) {
      this.collected = true;
      this.isDead = true;
    }
  }

  draw(ctx) {
    ctx.save();
    const pulse = 1 + Math.sin(this.age * this.pulseSpeed + this.pulsePhase) * 0.15;
    const currentRadius = this.radius * pulse;

    ctx.translate(this.x, this.y);

    if (this.type === 'spark') {
      // Golden Spark
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = this.color;

      ctx.beginPath();
      ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
      ctx.fill();

      // Inner white star
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, currentRadius * 0.45, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'prism') {
      // Prism Gem with shrinking lifetime ring
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 18;

      // Outer expiration ring
      if (this.lifespan !== Infinity) {
        const remaining = 1 - (this.age / this.lifespan);
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.4 + remaining * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remaining);
        ctx.stroke();
      }

      // Diamond Prism
      ctx.rotate(this.age * 2);
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.moveTo(0, -currentRadius * 1.3);
      ctx.lineTo(currentRadius * 1.3, 0);
      ctx.lineTo(0, currentRadius * 1.3);
      ctx.lineTo(-currentRadius * 1.3, 0);
      ctx.closePath();
      ctx.fill();

      // Hot core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, currentRadius * 0.4, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'shield') {
      // Shield Icon orb
      ctx.shadowColor = '#10e796';
      ctx.shadowBlur = 16;
      ctx.fillStyle = 'rgba(16, 231, 150, 0.2)';
      ctx.strokeStyle = '#10e796';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Shield crest
      ctx.fillStyle = '#10e796';
      ctx.beginPath();
      ctx.moveTo(0, -currentRadius * 0.5);
      ctx.lineTo(currentRadius * 0.5, -currentRadius * 0.2);
      ctx.lineTo(0, currentRadius * 0.6);
      ctx.lineTo(-currentRadius * 0.5, -currentRadius * 0.2);
      ctx.closePath();
      ctx.fill();

    } else if (this.type === 'chrono') {
      // Chrono Slow orb
      ctx.shadowColor = '#b5179e';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = '#b5179e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Hourglass / clock center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'magnet') {
      // Magnet Orb
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(0, 0, currentRadius * 0.7, Math.PI, 0, false);
      ctx.stroke();
    }

    ctx.restore();
  }
}

class ItemManager {
  constructor() {
    this.items = [];
    this.sparkTimer = 0;
    this.prismTimer = 0;
    this.powerUpTimer = 0;
  }

  clear() {
    this.items = [];
    this.sparkTimer = 0;
    this.prismTimer = 0;
    this.powerUpTimer = 0;
  }

  spawnSpark(arenaWidth, arenaHeight) {
    const margin = 35;
    const x = margin + Math.random() * (arenaWidth - margin * 2);
    const y = margin + Math.random() * (arenaHeight - margin * 2);
    this.items.push(new Item(x, y, 8, 'spark', 100, '#ffbe0b'));
  }

  // Risky Prism Crystal (spawns closer to center or near hazards)
  spawnPrism(arenaWidth, arenaHeight, hazards = []) {
    let x, y;
    if (hazards.length > 0 && Math.random() > 0.4) {
      // Pick a hazard and spawn near its trajectory for high risk / high reward!
      const targetHazard = hazards[Math.floor(Math.random() * hazards.length)];
      if (targetHazard.x && targetHazard.y) {
        const offset = 45 + Math.random() * 35;
        const angle = Math.random() * Math.PI * 2;
        x = Math.max(30, Math.min(arenaWidth - 30, targetHazard.x + Math.cos(angle) * offset));
        y = Math.max(30, Math.min(arenaHeight - 30, targetHazard.y + Math.sin(angle) * offset));
      } else {
        x = arenaWidth / 2 + (Math.random() - 0.5) * 200;
        y = arenaHeight / 2 + (Math.random() - 0.5) * 200;
      }
    } else {
      x = arenaWidth / 2 + (Math.random() - 0.5) * 200;
      y = arenaHeight / 2 + (Math.random() - 0.5) * 200;
    }

    this.items.push(new Item(x, y, 10, 'prism', 500, '#00f0ff'));
  }

  // Rare power-up spawn
  spawnPowerUp(arenaWidth, arenaHeight) {
    const margin = 40;
    const x = margin + Math.random() * (arenaWidth - margin * 2);
    const y = margin + Math.random() * (arenaHeight - margin * 2);

    const types = ['shield', 'chrono', 'magnet'];
    const selected = types[Math.floor(Math.random() * types.length)];
    const colors = {
      shield: '#10e796',
      chrono: '#b5179e',
      magnet: '#00f0ff'
    };

    this.items.push(new Item(x, y, 11, selected, 250, colors[selected]));
  }

  update(dt, player, hasMagnetActive, particleSystem, game) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.update(dt, player, hasMagnetActive);

      if (item.collected) {
        game.handleItemCollected(item);
        this.items.splice(i, 1);
      } else if (item.isDead) {
        this.items.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.items.length; i++) {
      this.items[i].draw(ctx);
    }
  }
}

window.ItemManager = ItemManager;
