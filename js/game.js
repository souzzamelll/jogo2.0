// Main Game Director, Loop, Mechanics & Scoring

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Systems
    this.particleSystem = new window.ParticleSystem();
    this.hazardManager = new window.HazardManager();
    this.itemManager = new window.ItemManager();
    this.player = new window.Player(400, 300);

    // Arena dimensions
    this.arenaWidth = 840;
    this.arenaHeight = 560;

    // State
    this.state = 'START'; // 'START', 'PLAYING', 'PAUSED', 'GAMEOVER'
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem('vertice_best') || '0', 10);
    this.totalGems = parseInt(localStorage.getItem('vertice_total_gems') || '0', 10);
    this.bestTime = parseFloat(localStorage.getItem('vertice_best_time') || '0');

    // Multiplier & Risk/Reward
    this.multiplier = 1.0;
    this.maxMultiplierRun = 1.0;
    this.multTimer = 1.0; // 0 to 1 decay progress
    this.multDuration = 4.5; // Seconds before decay
    this.grazesRun = 0;
    this.gemsRun = 0;

    // Time & Phases
    this.survivalTime = 0;
    this.lastTimestamp = performance.now();
    this.difficultyPhase = 1;

    // Event System
    this.activeEvent = null;
    this.eventTimer = 0;
    this.nextEventIn = 22; // Seconds until first random event

    // Screen Shake
    this.shakeTime = 0;
    this.shakeIntensity = 0;

    // Slow-mo (Chrono power-up)
    this.chronoTimer = 0;

    // UI Cache
    this.hudScore = document.getElementById('hud-score');
    this.hudBest = document.getElementById('hud-best');
    this.hudMultVal = document.getElementById('hud-mult-val');
    this.multMeterFill = document.getElementById('mult-meter-fill');
    this.eventBanner = document.getElementById('event-banner');
    this.bannerTitle = document.getElementById('banner-title');
    this.bannerSubtitle = document.getElementById('banner-subtitle');
    this.tutorialOverlay = document.getElementById('tutorial-overlay');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.gameoverOverlay = document.getElementById('gameover-overlay');
    this.newRecordBadge = document.getElementById('new-record-badge');
    this.finalScore = document.getElementById('final-score');
    this.finalTime = document.getElementById('final-time');
    this.finalMulti = document.getElementById('final-multi');
    this.finalGrazes = document.getElementById('final-grazes');
    this.unlockAlert = document.getElementById('unlock-alert');
    this.unlockText = document.getElementById('unlock-text');
    this.skinList = document.getElementById('skin-list');
    this.totalGemsEl = document.getElementById('total-gems');
    this.btnSound = document.getElementById('btn-sound');
    this.soundIcon = document.getElementById('sound-icon');

    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.bindEvents();
    this.updateHUD();
    this.renderSkinSelector();
    this.totalGemsEl.textContent = this.totalGems.toLocaleString('pt-BR');

    // Update sound icon state
    this.soundIcon.textContent = window.soundManager.muted ? '🔇' : '🔊';

    // Start loop
    requestAnimationFrame((ts) => this.loop(ts));
  }

  // Handle responsive canvas sizing & retina pixel ratio
  resizeCanvas() {
    const container = document.getElementById('canvas-container');
    const maxWidth = Math.min(container.clientWidth - 20, 920);
    const maxHeight = Math.min(container.clientHeight - 20, 620);

    const aspect = this.arenaWidth / this.arenaHeight;
    let w = maxWidth;
    let h = w / aspect;

    if (h > maxHeight) {
      h = maxHeight;
      w = h * aspect;
    }

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.arenaWidth * dpr;
    this.canvas.height = this.arenaHeight * dpr;
    this.canvas.style.width = `${Math.floor(w)}px`;
    this.canvas.style.height = `${Math.floor(h)}px`;

    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
  }

  bindEvents() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      // Audio activation on first interaction
      window.soundManager.init();

      if (e.code === 'Space' || e.code === 'Enter') {
        if (this.state === 'START') {
          this.startGame();
          e.preventDefault();
        } else if (this.state === 'GAMEOVER') {
          this.restartGame();
          e.preventDefault();
        }
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.state === 'PLAYING') {
          this.pauseGame();
        } else if (this.state === 'PAUSED') {
          this.resumeGame();
        }
      }

      if (e.code === 'KeyM') {
        this.toggleSound();
      }

      if (this.state === 'PLAYING') {
        this.player.handleKeyDown(e.code);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.state === 'PLAYING') {
        this.player.handleKeyUp(e.code);
      }
    });

    // Mouse Controls on Canvas
    const updatePointerPos = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.arenaWidth / rect.width;
      const scaleY = this.arenaHeight / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;
      this.player.handlePointerMove(x, y);
    };

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.state === 'PLAYING') {
        updatePointerPos(e.clientX, e.clientY);
      }
    });

    // Touch Controls
    this.canvas.addEventListener('touchstart', (e) => {
      window.soundManager.init();
      if (this.state === 'START') {
        this.startGame();
      } else if (this.state === 'GAMEOVER') {
        this.restartGame();
      } else if (this.state === 'PLAYING' && e.touches.length > 0) {
        updatePointerPos(e.touches[0].clientX, e.touches[0].clientY);
      }
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (this.state === 'PLAYING' && e.touches.length > 0) {
        updatePointerPos(e.touches[0].clientX, e.touches[0].clientY);
      }
      e.preventDefault();
    }, { passive: false });

    // Buttons
    document.getElementById('btn-start').addEventListener('click', () => {
      window.soundManager.init();
      this.startGame();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      this.restartGame();
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      this.resumeGame();
    });

    this.btnSound.addEventListener('click', () => {
      window.soundManager.init();
      this.toggleSound();
    });
  }

  toggleSound() {
    const isMuted = window.soundManager.toggleMute();
    this.soundIcon.textContent = isMuted ? '🔇' : '🔊';
  }

  startGame() {
    this.state = 'PLAYING';
    this.tutorialOverlay.classList.add('hidden');
    this.resetRun();
    window.soundManager.playPowerUp();
  }

  pauseGame() {
    this.state = 'PAUSED';
    this.pauseOverlay.classList.remove('hidden');
  }

  resumeGame() {
    this.state = 'PLAYING';
    this.pauseOverlay.classList.add('hidden');
    this.lastTimestamp = performance.now();
  }

  restartGame() {
    this.gameoverOverlay.classList.add('hidden');
    this.state = 'PLAYING';
    this.resetRun();
    window.soundManager.playPowerUp();
  }

  resetRun() {
    this.score = 0;
    this.multiplier = 1.0;
    this.maxMultiplierRun = 1.0;
    this.multTimer = 1.0;
    this.grazesRun = 0;
    this.gemsRun = 0;
    this.survivalTime = 0;
    this.difficultyPhase = 1;
    this.activeEvent = null;
    this.eventTimer = 0;
    this.nextEventIn = 22;
    this.chronoTimer = 0;

    this.canvas.classList.remove('danger-phase');
    this.eventBanner.classList.add('hidden');

    this.player.reset(this.arenaWidth / 2, this.arenaHeight / 2);
    this.hazardManager.clear();
    this.itemManager.clear();
    this.particleSystem.clear();

    // Initial item spawns
    this.itemManager.spawnSpark(this.arenaWidth, this.arenaHeight);
    this.itemManager.spawnSpark(this.arenaWidth, this.arenaHeight);
    this.itemManager.spawnPrism(this.arenaWidth, this.arenaHeight);

    // Initial hazards (simple bouncers)
    this.hazardManager.spawnBouncer(this.arenaWidth, this.arenaHeight, 2.0);
    this.hazardManager.spawnBouncer(this.arenaWidth, this.arenaHeight, 2.2);

    window.soundManager.setTempo(118);
    this.updateHUD();
  }

  triggerShake(intensity = 8, duration = 0.25) {
    this.shakeIntensity = intensity;
    this.shakeTime = duration;
  }

  // Risk / Reward Graze Mechanic
  handleGraze(x, y) {
    this.grazesRun++;
    const bonus = Math.floor(50 * this.multiplier);
    this.score += bonus;

    // Graze boosts combo multiplier significantly!
    this.multiplier = Math.min(10.0, +(this.multiplier + 0.2).toFixed(1));
    this.maxMultiplierRun = Math.max(this.maxMultiplierRun, this.multiplier);
    this.multTimer = 1.0; // Refresh multiplier meter

    this.particleSystem.emitGraze(x, y);
    this.particleSystem.addText(x, y - 18, `QUASE! +${bonus}`, '#ffffff', 14, true);
    window.soundManager.playGraze();

    this.triggerShake(3, 0.1);
    this.updateHUD();
  }

  // Item Collection
  handleItemCollected(item) {
    this.gemsRun++;
    this.totalGems++;
    localStorage.setItem('vertice_total_gems', this.totalGems);
    this.totalGemsEl.textContent = this.totalGems.toLocaleString('pt-BR');

    if (item.type === 'spark') {
      const pts = Math.floor(item.value * this.multiplier);
      this.score += pts;
      this.multiplier = Math.min(10.0, +(this.multiplier + 0.1).toFixed(1));
      this.maxMultiplierRun = Math.max(this.maxMultiplierRun, this.multiplier);
      this.multTimer = 1.0;

      this.particleSystem.emitCollect(item.x, item.y, item.color, 14);
      this.particleSystem.addText(item.x, item.y - 12, `+${pts}`, item.color, 15);
      window.soundManager.playCollect(this.multiplier);

      // Spawn replacement spark
      setTimeout(() => {
        if (this.state === 'PLAYING') {
          this.itemManager.spawnSpark(this.arenaWidth, this.arenaHeight);
        }
      }, 500);

    } else if (item.type === 'prism') {
      const pts = Math.floor(item.value * this.multiplier);
      this.score += pts;
      this.multiplier = Math.min(10.0, +(this.multiplier + 0.5).toFixed(1));
      this.maxMultiplierRun = Math.max(this.maxMultiplierRun, this.multiplier);
      this.multTimer = 1.0;

      this.particleSystem.emitCollect(item.x, item.y, '#00f0ff', 24);
      this.particleSystem.addText(item.x, item.y - 14, `PRISMA! +${pts}`, '#00f0ff', 18, true);
      window.soundManager.playRareCollect();
      this.triggerShake(5, 0.15);

      // Chance to spawn another prism later
      setTimeout(() => {
        if (this.state === 'PLAYING') {
          this.itemManager.spawnPrism(this.arenaWidth, this.arenaHeight, this.hazardManager.hazards);
        }
      }, 4000);

    } else if (item.type === 'shield') {
      this.player.hasShield = true;
      this.particleSystem.emitCollect(item.x, item.y, '#10e796', 20);
      this.particleSystem.addText(item.x, item.y - 14, 'ESCUDO ATIVADO!', '#10e796', 16, true);
      window.soundManager.playPowerUp();

    } else if (item.type === 'chrono') {
      this.chronoTimer = 5.0; // 5s slow mo
      this.particleSystem.emitCollect(item.x, item.y, '#b5179e', 20);
      this.particleSystem.addText(item.x, item.y - 14, 'DILATAÇÃO TEMPORAL!', '#b5179e', 16, true);
      window.soundManager.playPowerUp();

    } else if (item.type === 'magnet') {
      this.player.magnetTimer = 6.0;
      this.particleSystem.emitCollect(item.x, item.y, '#00f0ff', 20);
      this.particleSystem.addText(item.x, item.y - 14, 'IMÃ DE ENERGIA!', '#00f0ff', 16, true);
      window.soundManager.playPowerUp();
    }

    this.checkSkinUnlocks();
    this.updateHUD();
  }

  // Player Damaged / Lethal collision
  handlePlayerHit(player) {
    if (player.invulnerableTimer > 0) return;

    if (player.hasShield) {
      // Shield absorbs lethal hit
      player.hasShield = false;
      player.invulnerableTimer = 1.2;
      this.triggerShake(12, 0.35);

      this.particleSystem.emitShieldBreak(player.x, player.y);
      this.particleSystem.addText(player.x, player.y - 20, 'ESCUDO DESTRUIDO!', '#10e796', 18, true);
      window.soundManager.playShieldBreak();

      // Wipe close hazards
      this.hazardManager.clearNearby(player.x, player.y, 160);
      return;
    }

    // Death
    this.state = 'GAMEOVER';
    this.triggerShake(20, 0.6);
    this.particleSystem.emitExplosion(player.x, player.y, '#ff2a5f', 50);
    window.soundManager.playGameOver();

    this.showGameOver();
  }

  // Dynamic Event Dispatcher
  triggerRandomEvent() {
    const events = [
      {
        id: 'overcharge',
        title: 'SOBRECARGA NEON',
        subtitle: 'Velocidade aumentada! Pontos DOBRADOS (2x)!',
        icon: '⚡',
        duration: 8.0
      },
      {
        id: 'gem_shower',
        title: 'CHUVA DE CRISTAIS',
        subtitle: 'Abundância de energia na arena!',
        icon: '💎',
        duration: 6.0
      },
      {
        id: 'laser_grid',
        title: 'VARREDURA LASER',
        subtitle: 'Atenção aos feixes de alta tensão!',
        icon: '🚨',
        duration: 7.0
      },
      {
        id: 'cleanse_pulse',
        title: 'PULSO DE SEGURANÇA',
        subtitle: 'Onda neutralizadora limpando a arena!',
        icon: '🛡️',
        duration: 3.0
      }
    ];

    const ev = events[Math.floor(Math.random() * events.length)];
    this.activeEvent = ev;
    this.eventTimer = ev.duration;

    this.bannerTitle.textContent = ev.title;
    this.bannerSubtitle.textContent = ev.subtitle;
    this.eventBanner.querySelector('.banner-icon').textContent = ev.icon;
    this.eventBanner.classList.remove('hidden');

    // Event immediate impacts
    if (ev.id === 'gem_shower') {
      for (let i = 0; i < 5; i++) {
        this.itemManager.spawnSpark(this.arenaWidth, this.arenaHeight);
      }
      this.itemManager.spawnPrism(this.arenaWidth, this.arenaHeight);
    } else if (ev.id === 'laser_grid') {
      this.hazardManager.spawnLaser(this.arenaWidth, this.arenaHeight);
      setTimeout(() => {
        if (this.state === 'PLAYING') {
          this.hazardManager.spawnLaser(this.arenaWidth, this.arenaHeight);
        }
      }, 1000);
    } else if (ev.id === 'cleanse_pulse') {
      this.hazardManager.clearNearby(this.arenaWidth / 2, this.arenaHeight / 2, 400);
      this.particleSystem.addText(this.arenaWidth / 2, this.arenaHeight / 2, 'PULSO PURIFICADOR!', '#00f0ff', 24, true);
    }
  }

  update(dt) {
    if (this.state !== 'PLAYING') return;

    this.survivalTime += dt;

    // Passive score accumulation (scaled by survival time & risk multiplier)
    const eventScoreMult = this.activeEvent && this.activeEvent.id === 'overcharge' ? 2 : 1;
    this.score += Math.floor(15 * this.multiplier * eventScoreMult * dt);

    // Multiplier Meter Decay
    this.multTimer -= dt / this.multDuration;
    if (this.multTimer <= 0) {
      // Slowly decay multiplier down to 1.0x if player plays too safe
      this.multTimer = 0.5;
      if (this.multiplier > 1.0) {
        this.multiplier = Math.max(1.0, +(this.multiplier - 0.2).toFixed(1));
      }
    }

    // Chrono Slow-mo timer
    if (this.chronoTimer > 0) {
      this.chronoTimer -= dt;
    }
    const speedMult = (this.chronoTimer > 0 ? 0.5 : 1.0) * (this.activeEvent && this.activeEvent.id === 'overcharge' ? 1.25 : 1.0);

    // Difficulty Phase Progression
    const newPhase = 1 + Math.floor(this.survivalTime / 18);
    if (newPhase !== this.difficultyPhase) {
      this.difficultyPhase = newPhase;
      // Spawn new hazards as phases progress
      if (this.difficultyPhase === 2) {
        this.hazardManager.spawnLaser(this.arenaWidth, this.arenaHeight);
      } else if (this.difficultyPhase === 3) {
        this.hazardManager.spawnSeeker(this.arenaWidth, this.arenaHeight);
        this.itemManager.spawnPowerUp(this.arenaWidth, this.arenaHeight);
      } else if (this.difficultyPhase >= 4) {
        this.hazardManager.spawnBouncer(this.arenaWidth, this.arenaHeight, 2.6);
        this.hazardManager.spawnLaser(this.arenaWidth, this.arenaHeight);
      }

      // Visual border tension
      if (this.difficultyPhase >= 4) {
        this.canvas.classList.add('danger-phase');
      }

      // Ramp audio tempo
      window.soundManager.setTempo(118 + Math.min(32, this.difficultyPhase * 4));
    }

    // Periodic Laser & Hazard spawning
    this.hazardManager.laserTimer += dt;
    const laserInterval = Math.max(4.5, 9.0 - this.difficultyPhase * 0.8);
    if (this.hazardManager.laserTimer >= laserInterval && this.difficultyPhase >= 2) {
      this.hazardManager.laserTimer = 0;
      this.hazardManager.spawnLaser(this.arenaWidth, this.arenaHeight);
    }

    // Periodic Seeker Drone spawning
    this.hazardManager.seekerTimer += dt;
    const seekerInterval = Math.max(7.0, 14.0 - this.difficultyPhase * 1.0);
    if (this.hazardManager.seekerTimer >= seekerInterval && this.difficultyPhase >= 3) {
      this.hazardManager.seekerTimer = 0;
      this.hazardManager.spawnSeeker(this.arenaWidth, this.arenaHeight);
    }

    // Power-up occasional spawn
    this.itemManager.powerUpTimer += dt;
    if (this.itemManager.powerUpTimer >= 20.0 && this.difficultyPhase >= 2) {
      this.itemManager.powerUpTimer = 0;
      this.itemManager.spawnPowerUp(this.arenaWidth, this.arenaHeight);
    }

    // Dynamic Events Timer
    if (this.activeEvent) {
      this.eventTimer -= dt;
      if (this.eventTimer <= 0) {
        this.activeEvent = null;
        this.eventBanner.classList.add('hidden');
      }
    } else {
      this.nextEventIn -= dt;
      if (this.nextEventIn <= 0) {
        this.nextEventIn = 24 + Math.random() * 12;
        this.triggerRandomEvent();
      }
    }

    // Updates
    this.player.update(dt, this.arenaWidth, this.arenaHeight, this.particleSystem);
    this.hazardManager.update(dt, this.arenaWidth, this.arenaHeight, speedMult, this.player, this.particleSystem, this);
    this.itemManager.update(dt, this.player, this.player.magnetTimer > 0, this.particleSystem, this);
    this.particleSystem.update(dt);

    // Screen Shake
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
    }

    this.updateHUD();
  }

  updateHUD() {
    this.hudScore.textContent = this.score.toLocaleString('pt-BR');
    this.hudBest.textContent = Math.max(this.score, this.bestScore).toLocaleString('pt-BR');
    this.hudMultVal.textContent = `${this.multiplier.toFixed(1)}x`;

    // Multiplier badge glow up
    if (this.multiplier >= 3.0) {
      this.hudMultVal.classList.add('high-multiplier');
    } else {
      this.hudMultVal.classList.remove('high-multiplier');
    }

    // Meter fill
    const fillPercent = Math.max(0, Math.min(100, this.multTimer * 100));
    this.multMeterFill.style.width = `${fillPercent}%`;
  }

  showGameOver() {
    const isNewRecord = this.score > this.bestScore;
    if (isNewRecord) {
      this.bestScore = this.score;
      localStorage.setItem('vertice_best', this.bestScore);
    }

    if (this.survivalTime > this.bestTime) {
      this.bestTime = this.survivalTime;
      localStorage.setItem('vertice_best_time', this.bestTime.toString());
    }

    // Fill stats
    this.finalScore.textContent = this.score.toLocaleString('pt-BR');
    const mins = Math.floor(this.survivalTime / 60);
    const secs = Math.floor(this.survivalTime % 60);
    this.finalTime.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    this.finalMulti.textContent = `${this.maxMultiplierRun.toFixed(1)}x`;
    this.finalGrazes.textContent = this.grazesRun;

    if (isNewRecord && this.score > 0) {
      this.newRecordBadge.classList.remove('hidden');
    } else {
      this.newRecordBadge.classList.add('hidden');
    }

    this.checkSkinUnlocks(true);
    this.renderSkinSelector();

    this.gameoverOverlay.classList.remove('hidden');
  }

  checkSkinUnlocks(showNotification = false) {
    let newlyUnlocked = null;

    Object.values(window.SKINS).forEach(skin => {
      let unlocked = false;
      if (skin.reqPoints === 0) {
        unlocked = true;
      } else if (skin.id === 'prism') {
        unlocked = (this.score >= skin.reqPoints || this.bestScore >= skin.reqPoints || this.grazesRun >= 25);
      } else {
        unlocked = (this.score >= skin.reqPoints || this.bestScore >= skin.reqPoints);
      }

      const key = `vertice_skin_unlocked_${skin.id}`;
      const wasUnlocked = localStorage.getItem(key) === 'true';

      if (unlocked && !wasUnlocked) {
        localStorage.setItem(key, 'true');
        newlyUnlocked = skin.name;
      }
    });

    if (newlyUnlocked && showNotification) {
      this.unlockText.textContent = `Nova Skin Desbloqueada: ${newlyUnlocked}!`;
      this.unlockAlert.classList.remove('hidden');
    } else {
      this.unlockAlert.classList.add('hidden');
    }
  }

  renderSkinSelector() {
    this.skinList.innerHTML = '';

    Object.values(window.SKINS).forEach(skin => {
      let isUnlocked = skin.reqPoints === 0 || localStorage.getItem(`vertice_skin_unlocked_${skin.id}`) === 'true';
      if (!isUnlocked && (this.bestScore >= skin.reqPoints)) {
        isUnlocked = true;
        localStorage.setItem(`vertice_skin_unlocked_${skin.id}`, 'true');
      }

      const btn = document.createElement('button');
      btn.className = `skin-btn ${this.player.skin.id === skin.id ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`;
      btn.title = isUnlocked ? skin.name : `Bloqueado: Requer ${skin.desc}`;

      const orb = document.createElement('div');
      orb.className = 'skin-preview-orb';
      orb.style.backgroundColor = skin.primary;
      orb.style.color = skin.primary;

      btn.appendChild(orb);

      if (isUnlocked) {
        btn.addEventListener('click', () => {
          this.player.setSkin(skin.id);
          this.renderSkinSelector();
          window.soundManager.playCollect(1);
        });
      }

      this.skinList.appendChild(btn);
    });
  }

  draw() {
    this.ctx.save();

    // Screen Shake Offset
    if (this.shakeTime > 0) {
      const offsetX = (Math.random() - 0.5) * this.shakeIntensity;
      const offsetY = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(offsetX, offsetY);
    }

    // Clear Canvas with subtle motion trail
    this.ctx.fillStyle = '#070913';
    this.ctx.fillRect(0, 0, this.arenaWidth, this.arenaHeight);

    // Subtle arena grid
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    this.ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = gridSize; x < this.arenaWidth; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.arenaHeight);
      this.ctx.stroke();
    }
    for (let y = gridSize; y < this.arenaHeight; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.arenaWidth, y);
      this.ctx.stroke();
    }

    // Chrono slow-mo vignette effect
    if (this.chronoTimer > 0) {
      this.ctx.save();
      const grad = this.ctx.createRadialGradient(
        this.arenaWidth / 2, this.arenaHeight / 2, 100,
        this.arenaWidth / 2, this.arenaHeight / 2, 450
      );
      grad.addColorStop(0, 'rgba(181, 23, 158, 0)');
      grad.addColorStop(1, 'rgba(181, 23, 158, 0.18)');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.arenaWidth, this.arenaHeight);
      this.ctx.restore();
    }

    // Draw Entities
    this.itemManager.draw(this.ctx);
    this.hazardManager.draw(this.ctx);

    if (this.state !== 'GAMEOVER') {
      this.player.draw(this.ctx);
    }

    this.particleSystem.draw(this.ctx);

    this.ctx.restore();
  }

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame((ts) => this.loop(ts));
  }
}

// Start Game Instance on Load
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
