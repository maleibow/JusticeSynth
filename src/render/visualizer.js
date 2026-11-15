/**
 * JUSTICE SYNTH — Procedural 2D Gaussian-Splat Hydrodynamic Telemetry Visualizer
 *
 * Replaces cold wireframe geometry with an emotional, procedural fluid simulation:
 *  - Pre-baked anisotropic 2D Gaussian splats advected through opposing curl-noise currents
 *  - Visible hydrodynamic shear & dark water-tears ripping apart when carceral pressure swells
 *  - Explicit directional push/pull streams:
 *      * Individual humanity siphoned as people enter custody & Federal Spend ticks up
 *      * Capital streaming directly into Private Prison Stocks (CXW / GEO)
 *      * NYC Pre-Trial Custody pressure pulling inward
 *      * Restorative Families & Courts current pushing back into the Human Core
 *  - Custody deaths unleash physical shockwaves through the fluid & launch ascending embers
 *    into the permanent Memorial Sky
 *  - Direct clock-to-fluid droplet coupling & view modes ('clock', 'console', 'pure' NO TEXT)
 */

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Smooth deterministic 2D pseudo-noise for curl-fluid motion (zero allocation per call)
function hash2(ix, iy) {
  const n = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise2D(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);

  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

function curlVelocity(x, y, t) {
  const eps = 0.08;
  const n1 = valueNoise2D(x, y + eps + t);
  const n2 = valueNoise2D(x, y - eps + t);
  const n3 = valueNoise2D(x + eps - t * 0.7, y);
  const n4 = valueNoise2D(x - eps - t * 0.7, y);
  // 2D curl = (dN/dy, -dN/dx)
  return {
    vx: (n1 - n2) / (2 * eps),
    vy: -(n3 - n4) / (2 * eps)
  };
}

const SPLAT_PALETTE = {
  gold: [232, 184, 109],
  cyan: [92, 225, 230],
  teal: [52, 211, 153],
  amber: [245, 158, 11],
  coral: [251, 113, 133],
  violet: [167, 139, 250],
  crimson: [255, 51, 75],
  ember: [255, 234, 200],
  void: [5, 7, 13]
};

export class TelemetryVisualizer {
  constructor(canvas, tooltipEl, onNodeSelect = null, onWaterDrag = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tooltipEl = tooltipEl;
    this.onNodeSelect = onNodeSelect;
    this.onWaterDrag = onWaterDrag;

    this.width = 1280;
    this.height = 640;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.time = 0;
    this.viewMode = 'clock';
    this.deathFlash = 0;
    this.contractFlash = 0;
    this.nycFlash = 0;

    this.shockwaves = [];
    this.memorialStars = [];
    this.ascendingSouls = [];
    this.fluidParcels = [];
    this.streamDroplets = [];
    this.clockDroplets = [];
    this.touchRipples = [];

    this.hoveredStar = null;
    this.selectedSection = null;
    this.hoveredNode = null;
    this.nodeHitboxes = [];

    this.pointerX = -999;
    this.pointerY = -999;
    this.prevPointerX = -999;
    this.prevPointerY = -999;
    this.waterDragging = false;
    this.lastSplashTime = 0;

    this.sprites = {};
    this._cachedVortices = [];

    this.initGaussianSprites();
    this.initFluidField();
    this.initForceStreams();
    this.initClockDroplets();
    this.resize();
    this.bindPointerEvents();
  }

  setSelectedSection(sectionKey) {
    this.selectedSection = sectionKey;
  }

  setViewMode(mode) {
    this.viewMode = mode || 'clock';
    if (this.viewMode === 'pure' && this.tooltipEl) {
      this.tooltipEl.classList.add('hidden');
    }
  }

  /**
   * Pre-bake smooth 2D Gaussian radial kernels once into offscreen canvases
   * so we can render 400+ anisotropic rotated splats smoothly at 60fps.
   */
  initGaussianSprites() {
    const size = 96;
    const half = size * 0.5;
    const sigma = 0.34;
    const twoSigmaSq = 2 * sigma * sigma;

    for (const [key, [r, g, b]] of Object.entries(SPLAT_PALETTE)) {
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const octx = off.getContext('2d');
      const img = octx.createImageData(size, size);
      const data = img.data;

      for (let py = 0; py < size; py++) {
        const ny = (py + 0.5 - half) / half;
        for (let px = 0; px < size; px++) {
          const nx = (px + 0.5 - half) / half;
          const r2 = nx * nx + ny * ny;
          const idx = (py * size + px) * 4;
          if (r2 >= 1.0) {
            data[idx + 3] = 0;
            continue;
          }
          // Smooth truncated Gaussian falloff to zero at boundary
          const gaussian = Math.exp(-r2 / twoSigmaSq);
          const edgeFade = Math.max(0, 1 - Math.pow(r2, 2.2));
          const alpha = clamp(gaussian * edgeFade, 0, 1);

          // Slightly hotter center highlight for luminous splats
          const hot = key === 'void' ? 0 : Math.exp(-r2 / 0.08) * 32;
          data[idx] = Math.min(255, Math.round(r + hot));
          data[idx + 1] = Math.min(255, Math.round(g + hot));
          data[idx + 2] = Math.min(255, Math.round(b + hot));
          data[idx + 3] = Math.round(alpha * 255);
        }
      }
      octx.putImageData(img, 0, 0);
      this.sprites[key] = off;
    }
  }

  drawSplat(ctx, colorKey, x, y, rx, ry, angle, alpha, composite = 'lighter') {
    const sprite = this.sprites[colorKey];
    if (!sprite || alpha <= 0.005 || rx <= 0.5 || ry <= 0.5) return;
    ctx.save();
    ctx.globalCompositeOperation = composite;
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.translate(x, y);
    if (angle !== 0) ctx.rotate(angle);
    ctx.drawImage(sprite, -rx, -ry, rx * 2, ry * 2);
    ctx.restore();
  }

  initFluidField() {
    const roles = ['human', 'human', 'human', 'system', 'system', 'stock', 'custody', 'community', 'tear'];
    for (let i = 0; i < 170; i++) {
      const role = roles[i % roles.length];
      this.fluidParcels.push({
        nx: 0.1 + Math.random() * 0.8,
        ny: 0.22 + Math.random() * 0.66,
        vx: (Math.random() - 0.5) * 0.04,
        vy: (Math.random() - 0.5) * 0.04,
        size: 16 + Math.random() * 28,
        role,
        seed: Math.random() * 100,
        alpha: 0.22 + Math.random() * 0.34
      });
    }
  }

  initForceStreams() {
    const streamTypes = [
      { kind: 'individual_siphon', count: 55 }, // Center human core -> Federal Spend
      { kind: 'stock_inflow', count: 55 },      // Federal Spend & Center -> Prison Stock (money in!)
      { kind: 'custody_pull', count: 45 },      // Outer / Clock -> NYC Custody -> Center pressure
      { kind: 'mortality_tear', count: 30 },    // Custody Deaths -> tearing into Center
      { kind: 'community_heal', count: 35 }     // Courts & Families -> restorative inflow to Center
    ];

    for (const def of streamTypes) {
      for (let i = 0; i < def.count; i++) {
        this.streamDroplets.push({
          kind: def.kind,
          t: Math.random(),
          speed: 0.14 + Math.random() * 0.24,
          lane: (Math.random() - 0.5) * 2,
          size: 4.5 + Math.random() * 9.5,
          phase: Math.random() * Math.PI * 2,
          shockOffsetX: 0,
          shockOffsetY: 0
        });
      }
    }
  }

  initClockDroplets() {
    const keys = ['equity', 'spending', 'nycdoc', 'mortality', 'community'];
    for (let i = 0; i < 55; i++) {
      const key = keys[i % keys.length];
      this.clockDroplets.push({
        key,
        t: Math.random(),
        speed: 0.25 + Math.random() * 0.35,
        sway: (Math.random() - 0.5) * 24,
        size: 5 + Math.random() * 7
      });
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
  }

  bindPointerEvents() {
    const updatePos = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      this.prevPointerX = this.pointerX;
      this.prevPointerY = this.pointerY;
      this.pointerX = clientX - rect.left;
      this.pointerY = clientY - rect.top;
      this.checkStarHover();
      this.checkNodeHover();

      if (this.waterDragging && rect.width && rect.height) {
        const nx = clamp(this.pointerX / rect.width, 0, 1);
        const ny = clamp(1 - this.pointerY / rect.height, 0, 1);
        if (typeof this.onWaterDrag === 'function') {
          this.onWaterDrag(nx, ny);
        }
        this.spawnTouchRipple(this.pointerX, this.pointerY, true);
      } else if (this.time - this.lastSplashTime > 0.06 && this.pointerX > 0) {
        this.lastSplashTime = this.time;
        this.spawnTouchRipple(this.pointerX, this.pointerY, false);
      }
    };

    this.canvas.addEventListener('pointermove', (e) => {
      updatePos(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      updatePos(e.clientX, e.clientY);
      if (this.hoveredNode && typeof this.onNodeSelect === 'function') {
        this.onNodeSelect(this.hoveredNode);
        return;
      }
      if (!this.hoveredStar) {
        this.waterDragging = true;
        this.canvas.setPointerCapture?.(e.pointerId);
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width && rect.height && typeof this.onWaterDrag === 'function') {
          const nx = clamp(this.pointerX / rect.width, 0, 1);
          const ny = clamp(1 - this.pointerY / rect.height, 0, 1);
          this.onWaterDrag(nx, ny);
        }
        this.spawnTouchRipple(this.pointerX, this.pointerY, true);
      }
    });

    const stopDrag = () => {
      this.waterDragging = false;
    };

    window.addEventListener('pointerup', stopDrag);
    this.canvas.addEventListener('pointercancel', stopDrag);

    this.canvas.addEventListener('pointerleave', () => {
      if (!this.waterDragging) {
        this.pointerX = -999;
        this.pointerY = -999;
        this.hoveredStar = null;
        this.hoveredNode = null;
        this.canvas.style.cursor = 'default';
        if (this.tooltipEl) this.tooltipEl.classList.add('hidden');
      }
    });
  }

  spawnTouchRipple(x, y, strong = false) {
    if (this.touchRipples.length > 32) this.touchRipples.shift();
    const dx = this.prevPointerX > 0 ? clamp((this.pointerX - this.prevPointerX) * 2.2, -120, 120) : 0;
    const dy = this.prevPointerY > 0 ? clamp((this.pointerY - this.prevPointerY) * 2.2, -120, 120) : 0;
    this.touchRipples.push({
      x,
      y,
      dx,
      dy,
      radius: strong ? 22 : 12,
      alpha: strong ? 0.72 : 0.28,
      colorKey: strong ? 'gold' : 'cyan'
    });
  }

  checkNodeHover() {
    let hit = null;
    for (const box of this.nodeHitboxes) {
      if (box.radius) {
        const d = Math.hypot(this.pointerX - box.cx, this.pointerY - box.cy);
        if (d <= box.radius) {
          hit = box.key;
          break;
        }
      }
      if (
        this.pointerX >= box.x &&
        this.pointerX <= box.x + box.w &&
        this.pointerY >= box.y &&
        this.pointerY <= box.y + box.h
      ) {
        hit = box.key;
        break;
      }
    }
    this.hoveredNode = hit;
    this.canvas.style.cursor = hit || this.hoveredStar ? 'pointer' : this.waterDragging ? 'grabbing' : 'grab';
  }

  checkStarHover() {
    if (!this.tooltipEl || this.viewMode === 'pure') return;
    let closest = null;
    let minDist = 20;
    const starYMin = this.getHudBottomOffset(this.width, this.height) + 14;

    for (const star of this.memorialStars) {
      const sx = star.nx * this.width;
      const sy = Math.max(starYMin, star.ny * this.height);
      const d = Math.hypot(this.pointerX - sx, this.pointerY - sy);
      if (d < minDist) {
        minDist = d;
        closest = { ...star, renderY: sy };
      }
    }

    this.hoveredStar = closest;
    if (!closest) {
      this.tooltipEl.classList.add('hidden');
      return;
    }

    const r = closest.record;
    const ageLabel = r.age ? `Age ${r.age}` : 'Age Unrecorded';
    this.tooltipEl.innerHTML = `
      <div style="color:#ff8e9b;font-weight:700;margin-bottom:3px;">IN MEMORIAM · ${r.facility}</div>
      <div>${ageLabel} · ${r.race} ${r.sex}</div>
      <div>Status: <strong>${r.trial_status}</strong></div>
      <div>Days Held: <strong>${r.days_incarcerated}</strong></div>
      <div style="color:#98a2b3;margin-top:3px;">${r.cause_of_death}</div>
    `;
    const tx = clamp(closest.nx * this.width + 14, 10, Math.max(20, this.width - 320));
    const ty = clamp(closest.renderY - 20, 10, Math.max(20, this.height - 130));
    this.tooltipEl.style.left = `${tx}px`;
    this.tooltipEl.style.top = `${ty}px`;
    this.tooltipEl.classList.remove('hidden');
  }

  triggerDeathShock(record) {
    this.deathFlash = 1.0;
    const cx = this.width * 0.5;
    const cy = this.height * 0.52;

    // Primary hydrodynamic shockwave tearing outward from the heart
    this.shockwaves.push({
      x: cx,
      y: cy,
      radius: 16,
      alpha: 1.0,
      force: 1.05,
      bandWidth: 68,
      colorKey: 'crimson',
      colorHex: '#ff334b',
      speed: 320
    });

    // Secondary trailing thermal/grief wave
    this.shockwaves.push({
      x: cx,
      y: cy,
      radius: 6,
      alpha: 0.78,
      force: 0.65,
      bandWidth: 46,
      colorKey: 'ember',
      colorHex: '#ffd6a5',
      speed: 215
    });

    // Shock ripple erupting from the mortality vortex too
    const mortVortex = this._cachedVortices.find(v => v.key === 'mortality');
    if (mortVortex) {
      this.shockwaves.push({
        x: mortVortex.sx,
        y: mortVortex.sy,
        radius: 10,
        alpha: 0.85,
        force: 0.72,
        bandWidth: 48,
        colorKey: 'crimson',
        colorHex: '#ff334b',
        speed: 240
      });
    }

    const idx = this.memorialStars.length;
    const nx = clamp(0.14 + ((idx * 0.173) % 0.72) + (Math.random() - 0.5) * 0.04, 0.11, 0.89);
    const ny = clamp(0.17 + ((idx * 0.071) % 0.14), 0.16, 0.32);

    const newStar = {
      nx,
      ny,
      record,
      bornAt: this.time,
      phase: Math.random() * Math.PI * 2
    };
    this.memorialStars.push(newStar);
    if (this.memorialStars.length > 84) {
      this.memorialStars.shift();
    }

    // Launch ascending luminous soul ember rising from core to sky star
    this.ascendingSouls.push({
      startX: cx + (Math.random() - 0.5) * 24,
      startY: cy,
      targetNx: nx,
      targetNy: ny,
      t: 0,
      speed: 0.48
    });
  }

  triggerContractPulse() {
    this.contractFlash = 0.9;
    const spendVortex = this._cachedVortices.find(v => v.key === 'spending');
    const equityVortex = this._cachedVortices.find(v => v.key === 'equity');
    const ox = spendVortex ? spendVortex.sx : this.width * 0.18;
    const oy = spendVortex ? spendVortex.sy : this.height * 0.54;

    this.shockwaves.push({
      x: ox,
      y: oy,
      radius: 18,
      alpha: 0.72,
      force: 0.52,
      bandWidth: 42,
      colorKey: 'coral',
      colorHex: '#fb7185',
      speed: 210
    });

    if (equityVortex) {
      this.shockwaves.push({
        x: equityVortex.sx,
        y: equityVortex.sy,
        radius: 14,
        alpha: 0.6,
        force: 0.38,
        bandWidth: 36,
        colorKey: 'amber',
        colorHex: '#f59e0b',
        speed: 175
      });
    }
  }

  triggerNycPulse() {
    this.nycFlash = 0.85;
    const nycVortex = this._cachedVortices.find(v => v.key === 'nycdoc');
    if (!nycVortex) return;
    this.shockwaves.push({
      x: nycVortex.sx,
      y: nycVortex.sy,
      radius: 14,
      alpha: 0.65,
      force: 0.42,
      bandWidth: 38,
      colorKey: 'violet',
      colorHex: '#a78bfa',
      speed: 180
    });
  }

  getHudBottomOffset(w, h) {
    if (this.viewMode === 'pure') return 16;
    if (typeof document === 'undefined') return w < 640 ? 150 : 88;
    const hud = document.getElementById('clock-stage-hud');
    if (!hud) return w < 640 ? 140 : 84;
    const hudRect = hud.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    if (!hudRect.height || !canvasRect.width) return w < 640 ? 155 : 86;
    return clamp(hudRect.bottom - canvasRect.top, 40, h * 0.56);
  }

  getClockAnchors(w, h) {
    const anchors = {};
    const canvasRect = this.canvas.getBoundingClientRect();
    if (this.viewMode !== 'pure' && typeof document !== 'undefined' && canvasRect.width) {
      document.querySelectorAll('.clock-hud-cell[data-clock-node]').forEach(el => {
        const key = el.dataset.clockNode;
        const r = el.getBoundingClientRect();
        if (r.width && r.height) {
          anchors[key] = {
            x: clamp(r.left + r.width * 0.5 - canvasRect.left, 20, w - 20),
            y: clamp(r.bottom - canvasRect.top, 10, h * 0.45)
          };
        }
      });
    }
    const keys = ['equity', 'spending', 'nycdoc', 'mortality', 'community'];
    keys.forEach((k, idx) => {
      if (!anchors[k]) {
        anchors[k] = { x: w * (0.12 + idx * 0.19), y: 20 };
      }
    });
    return anchors;
  }

  getVortexDefinitions(w, h, cx, cy, snapshot, hudBottom) {
    const ch = snapshot.channels;
    const isNarrow = w < 640;

    const contractAmt = snapshot.currentContract
      ? (snapshot.currentContract.amount >= 1e6
        ? `$${(snapshot.currentContract.amount / 1e6).toFixed(1)}M`
        : `$${Math.round(snapshot.currentContract.amount / 1e3)}K`)
      : '$2,561/s';
    const nycTotal = snapshot.nycStats?.total || 6628;
    const nycPretrial = snapshot.nycStats?.pretrial || 5696;
    const nycPretrialPct = Math.round((nycPretrial / Math.max(1, nycTotal)) * 100);
    const nycdocChannel = ch.nycdoc || { modulated: 0.4, pulse: 0 };

    const topSafeY = Math.max(hudBottom + (isNarrow ? 34 : 52), h * 0.35);
    const bottomSafeY = Math.min(h - (isNarrow ? 112 : 96), h * 0.72);
    const midY = (topSafeY + bottomSafeY) * 0.5;

    return [
      {
        key: 'equity',
        sx: isNarrow ? w * 0.18 : w * 0.16,
        sy: topSafeY,
        colorKey: 'amber',
        colorHex: '#f59e0b',
        level: ch.equity.modulated,
        pulse: ch.equity.pulse,
        title: 'PRISON STOCK',
        metric: `CXW $${snapshot.stocks.cxw.price.toFixed(2)} · GEO $${snapshot.stocks.geo.price.toFixed(2)}`,
        forceCue: 'MONEY FLOWING IN'
      },
      {
        key: 'spending',
        sx: isNarrow ? w * 0.16 : w * 0.13,
        sy: isNarrow ? lerp(topSafeY, bottomSafeY, 0.5) : midY,
        colorKey: 'coral',
        colorHex: '#fb7185',
        level: ch.spending.modulated,
        pulse: ch.spending.pulse,
        title: 'FEDERAL SPEND',
        metric: `${contractAmt} · $2,561/s`,
        forceCue: 'PULLS FROM PEOPLE'
      },
      {
        key: 'nycdoc',
        sx: isNarrow ? w * 0.22 : w * 0.23,
        sy: bottomSafeY,
        colorKey: 'violet',
        colorHex: '#a78bfa',
        level: nycdocChannel.modulated,
        pulse: nycdocChannel.pulse,
        title: 'NYC CUSTODY',
        metric: `${nycTotal.toLocaleString('en-US')} HELD · ${nycPretrialPct}% PRE-TRIAL`,
        forceCue: 'DETENTION PRESSURE'
      },
      {
        key: 'mortality',
        sx: isNarrow ? w * 0.82 : w * 0.84,
        sy: topSafeY + (isNarrow ? 8 : 12),
        colorKey: 'crimson',
        colorHex: '#ff334b',
        level: ch.mortality.modulated,
        pulse: ch.mortality.pulse,
        title: 'CUSTODY DEATHS',
        metric: `${snapshot.loggedDeathsCount} LOGGED`,
        forceCue: 'SHOCKWAVE RUPTURE'
      },
      {
        key: 'community',
        sx: isNarrow ? w * 0.80 : w * 0.81,
        sy: isNarrow ? lerp(topSafeY, bottomSafeY, 0.82) : bottomSafeY - 22,
        colorKey: 'teal',
        colorHex: '#34d399',
        level: ch.community.modulated,
        pulse: ch.community.pulse,
        title: 'COURTS & FAMILIES',
        metric: '2.7M CHILDREN',
        forceCue: 'PUSHES FOR HUMANITY'
      }
    ];
  }

  sampleFluidVelocity(x, y, cx, cy, sanctuary, pressure, vortexMap) {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy) + 1;
    const nx = dx / dist;
    const ny = dy / dist;
    const tangX = -ny;
    const tangY = nx;

    const curl = curlVelocity(x * 0.0045, y * 0.0045, this.time * 0.22);

    // 1. Human / Sanctuary current: warm, cohesive counter-clockwise vortex holding center together
    const corePull = clamp(1 - dist / 280, -0.35, 1.0);
    const vHumanX = tangX * (42 + sanctuary * 68) - nx * (18 * corePull * (0.5 + sanctuary)) + curl.vx * 26;
    const vHumanY = tangY * (42 + sanctuary * 68) - ny * (18 * corePull * (0.5 + sanctuary)) + curl.vy * 26;

    // 2. Opposing Systemic shear: rips water in the opposite direction, siphoning toward spending & stock
    let siphonX = nx * (36 + pressure * 75);
    let siphonY = ny * (36 + pressure * 75);

    if (vortexMap.spending) {
      const sdx = vortexMap.spending.sx - x;
      const sdy = vortexMap.spending.sy - y;
      const sd = Math.hypot(sdx, sdy) + 40;
      const pull = (3200 * (0.4 + pressure * 0.8)) / (sd * sd * 0.015 + 60);
      siphonX += (sdx / sd) * pull;
      siphonY += (sdy / sd) * pull;
    }

    if (vortexMap.equity && vortexMap.spending) {
      // Capital current rising into prison stock
      const edx = vortexMap.equity.sx - x;
      const edy = vortexMap.equity.sy - y;
      const ed = Math.hypot(edx, edy) + 45;
      if (ed < 260) {
        const lift = (1 - ed / 260) * (24 + pressure * 35);
        siphonX += (edx / ed) * lift - (edy / ed) * 18;
        siphonY += (edy / ed) * lift + (edx / ed) * 18;
      }
    }

    const vSystemX = -tangX * (28 + pressure * 92) + siphonX - curl.vx * (34 + pressure * 36);
    const vSystemY = -tangY * (28 + pressure * 92) + siphonY - curl.vy * (34 + pressure * 36);

    // Combine opposing forces; where both are strong, shear & ripping turbulence peak
    const weightSystem = clamp(0.28 + pressure * 0.56 - sanctuary * 0.18, 0.14, 0.88);
    let vx = lerp(vHumanX, vSystemX, weightSystem);
    let vy = lerp(vHumanY, vSystemY, weightSystem);

    // Physical shockwave blast pushes and shears parcels along wavefront
    for (const wave of this.shockwaves) {
      const wdx = x - wave.x;
      const wdy = y - wave.y;
      const wd = Math.hypot(wdx, wdy) + 1;
      const diff = Math.abs(wd - wave.radius);
      if (diff < wave.bandWidth) {
        const crest = Math.cos((diff / wave.bandWidth) * Math.PI * 0.5);
        const blast = crest * wave.force * wave.alpha * 340;
        vx += (wdx / wd) * blast - (wdy / wd) * blast * 0.35;
        vy += (wdy / wd) * blast + (wdx / wd) * blast * 0.35;
      }
    }

    // Touch / water-drag wake force
    for (const r of this.touchRipples) {
      const rdx = x - r.x;
      const rdy = y - r.y;
      const rd = Math.hypot(rdx, rdy) + 1;
      if (rd < 120) {
        const falloff = (1 - rd / 120) * r.alpha;
        vx += r.dx * falloff * 1.4 + (rdx / rd) * 32 * falloff;
        vy += r.dy * falloff * 1.4 + (rdy / rd) * 32 * falloff;
      }
    }

    const oppDiff = Math.hypot(vHumanX - vSystemX, vHumanY - vSystemY);
    const shear = clamp((oppDiff * weightSystem * (1 - weightSystem)) / 52 + this.deathFlash * 0.45, 0, 1.5);

    return { vx, vy, shear };
  }

  render(dt, snapshot, synth) {
    const safeDt = Math.min(dt, 0.05);
    this.time += safeDt;
    this.deathFlash = Math.max(0, this.deathFlash - safeDt * 1.25);
    this.contractFlash = Math.max(0, this.contractFlash - safeDt * 1.05);
    this.nycFlash = Math.max(0, this.nycFlash - safeDt * 1.1);

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Liquid persistence fade (soft afterimage trails give fluid continuity)
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = this.deathFlash > 0.08
      ? `rgba(26, 6, 11, ${0.26 + this.deathFlash * 0.24})`
      : 'rgba(6, 8, 13, 0.28)';
    ctx.fillRect(0, 0, w, h);

    const hudBottom = this.getHudBottomOffset(w, h);
    const isNarrow = w < 640;
    const cx = w * 0.5;
    const cy = clamp(
      isNarrow ? Math.max(hudBottom + 115, h * 0.56) : Math.max(hudBottom + 135, h * 0.52),
      h * 0.44,
      h * 0.62
    );
    const minDim = Math.min(w, h);
    const baseRadius = clamp(minDim * 0.17, 44, 118);

    const synthState = synth.state;
    const sanctuary = synthState.sanctuaryStrength;
    const pressure = synthState.systemicPressure;
    const ch = snapshot.channels;

    const vortices = this.getVortexDefinitions(w, h, cx, cy, snapshot, hudBottom);
    this._cachedVortices = vortices;
    const vortexMap = {};
    for (const v of vortices) vortexMap[v.key] = v;

    // 1. Deep Ambient Ocean Bed & Opposing Water Currents + Fissures
    this.updateAndDrawFluidField(ctx, safeDt, w, h, cx, cy, sanctuary, pressure, vortexMap, hudBottom);

    // 2. Clock-to-Fluid Live Coupling Droplets
    if (this.viewMode !== 'pure') {
      this.updateAndDrawClockDroplets(ctx, safeDt, w, h, vortexMap, pressure);
    }

    // 3. Explicit Push/Pull Directional Force Streams (Stock Inflow, Federal Siphon, Detention, Community)
    this.updateAndDrawForceStreams(ctx, safeDt, cx, cy, sanctuary, pressure, vortexMap, ch);

    // 4. Volumetric Fluid Human Core Torn by Pressure
    this.drawFluidSanctuaryCore(ctx, cx, cy, baseRadius, sanctuary, pressure, ch);

    // 5. 5 Fluid Energy Circles (Vortices) & Hitboxes
    this.drawFluidDataVortices(ctx, w, h, cx, cy, vortices);

    // 6. Hydrodynamic Custody Death Shockwaves & Ascending Soul Embers
    this.drawShockwaves(ctx, safeDt, w, h, cx, cy);
    this.updateAndDrawAscendingSouls(ctx, safeDt, w, h, hudBottom);

    // 7. Permanent Custody Memorial Sky Stars (remain on screen)
    this.drawMemorialSky(ctx, w, h, hudBottom);

    // 8. Touch / Drag Water Ripples
    this.updateAndDrawTouchRipples(ctx, safeDt);

    // 9. Fluid Acoustic Swell Horizon
    this.drawFluidWaveHorizon(ctx, w, h, synth, sanctuary, pressure);

    // 10. Brief Fluid Tear Flash on New Custody Death
    if (this.deathFlash > 0.05) {
      const yTear = cy + Math.sin(this.time * 32) * 18;
      this.drawSplat(ctx, 'crimson', cx, yTear, w * 0.55, 8 + this.deathFlash * 22, 0, this.deathFlash * 0.42);
      this.drawSplat(ctx, 'void', cx, yTear, w * 0.48, 3 + this.deathFlash * 8, 0, this.deathFlash * 0.72, 'source-over');
    }

    ctx.restore();
  }

  updateAndDrawFluidField(ctx, dt, w, h, cx, cy, sanctuary, pressure, vortexMap, hudBottom) {
    // Deep luminous basin wash under the center
    this.drawSplat(
      ctx,
      pressure > sanctuary * 1.15 ? 'crimson' : 'cyan',
      cx,
      cy,
      clamp(w * 0.32, 160, 420),
      clamp(h * 0.28, 120, 310),
      this.time * 0.05,
      0.07 + sanctuary * 0.06
    );

    const safeTopNorm = clamp((hudBottom + 16) / Math.max(1, h), 0.14, 0.42);

    for (const p of this.fluidParcels) {
      let x = p.nx * w;
      let y = p.ny * h;

      const field = this.sampleFluidVelocity(x, y, cx, cy, sanctuary, pressure, vortexMap);
      p.vx = lerp(p.vx, field.vx, clamp(dt * 2.6, 0, 1));
      p.vy = lerp(p.vy, field.vy, clamp(dt * 2.6, 0, 1));

      x += p.vx * dt;
      y += p.vy * dt;

      // Wrap smoothly inside active fluid ocean
      if (x < -40 || x > w + 40 || y < hudBottom - 10 || y > h + 30) {
        if (p.role === 'human' || p.role === 'community') {
          const ang = Math.random() * Math.PI * 2;
          const r = 18 + Math.random() * 90;
          x = cx + Math.cos(ang) * r;
          y = cy + Math.sin(ang) * r;
        } else {
          p.nx = 0.08 + Math.random() * 0.84;
          p.ny = safeTopNorm + Math.random() * (0.9 - safeTopNorm);
          x = p.nx * w;
          y = p.ny * h;
        }
      }

      p.nx = x / Math.max(1, w);
      p.ny = y / Math.max(1, h);

      const speed = Math.hypot(p.vx, p.vy);
      const angle = Math.atan2(p.vy, p.vx);
      const stretch = clamp(1.15 + speed * 0.011 + field.shear * 1.35, 1.0, 3.6);
      const rx = p.size * stretch;
      const ry = p.size * clamp(0.88 - field.shear * 0.34, 0.32, 0.9);

      let colorKey = 'gold';
      let alpha = p.alpha;
      let composite = 'lighter';

      if (p.role === 'human') {
        colorKey = (Math.floor(p.seed) % 2 === 0) ? 'gold' : 'cyan';
        alpha *= 0.4 + sanctuary * 0.72;
      } else if (p.role === 'community') {
        colorKey = 'teal';
        alpha *= 0.36 + sanctuary * 0.62;
      } else if (p.role === 'stock') {
        colorKey = 'amber';
        alpha *= 0.34 + pressure * 0.56 + this.contractFlash * 0.25;
      } else if (p.role === 'custody') {
        colorKey = 'violet';
        alpha *= 0.3 + pressure * 0.5 + this.nycFlash * 0.25;
      } else if (p.role === 'system') {
        colorKey = this.deathFlash > 0.35 ? 'crimson' : 'coral';
        alpha *= 0.3 + pressure * 0.6;
      } else if (p.role === 'tear') {
        // Dark vacuum rifts visibly tear apart colliding streams
        colorKey = 'void';
        composite = 'source-over';
        alpha = clamp(0.32 + field.shear * 0.45 + pressure * 0.22, 0.18, 0.85);
      }

      this.drawSplat(ctx, colorKey, x, y, rx, ry, angle, alpha, composite);
    }
  }

  updateAndDrawClockDroplets(ctx, dt, w, h, vortexMap, pressure) {
    const anchors = this.getClockAnchors(w, h);
    const colorMap = {
      equity: 'amber',
      spending: 'coral',
      nycdoc: 'violet',
      mortality: 'crimson',
      community: 'teal'
    };

    for (const d of this.clockDroplets) {
      d.t += dt * (d.speed + pressure * 0.12);
      if (d.t >= 1) d.t -= 1;

      const start = anchors[d.key];
      const end = vortexMap[d.key];
      if (!start || !end) continue;

      const t = d.t;
      const omt = 1 - t;
      const ctrlX = lerp(start.x, end.sx, 0.35) + Math.sin(this.time * 1.4 + d.sway) * 26;
      const ctrlY = lerp(start.y, end.sy, 0.55);

      const x = omt * omt * start.x + 2 * omt * t * ctrlX + t * t * end.sx;
      const y = omt * omt * start.y + 2 * omt * t * ctrlY + t * t * end.sy;

      const dx = 2 * omt * (ctrlX - start.x) + 2 * t * (end.sx - ctrlX);
      const dy = 2 * omt * (ctrlY - start.y) + 2 * t * (end.sy - ctrlY);
      const angle = Math.atan2(dy, dx);
      const fade = Math.sin(t * Math.PI);

      this.drawSplat(ctx, colorMap[d.key] || 'cyan', x, y, d.size * 1.8, d.size * 0.65, angle, 0.28 * fade);
    }
  }

  updateAndDrawForceStreams(ctx, dt, cx, cy, sanctuary, pressure, vortexMap, ch) {
    for (const d of this.streamDroplets) {
      let streamSpeed = d.speed;
      if (d.kind === 'stock_inflow') {
        streamSpeed *= 0.85 + ch.equity.modulated * 0.9 + this.contractFlash * 0.6;
      } else if (d.kind === 'individual_siphon') {
        streamSpeed *= 0.85 + ch.spending.modulated * 0.95;
      } else if (d.kind === 'custody_pull') {
        streamSpeed *= 0.8 + (ch.nycdoc?.modulated || 0.5) * 0.85;
      } else if (d.kind === 'mortality_tear') {
        streamSpeed *= 0.75 + ch.mortality.modulated * 1.1 + this.deathFlash * 1.4;
      } else if (d.kind === 'community_heal') {
        streamSpeed *= 0.8 + sanctuary * 0.85;
      }

      d.t += dt * streamSpeed;
      if (d.t >= 1) {
        d.t -= 1;
        d.shockOffsetX = 0;
        d.shockOffsetY = 0;
      }

      const eq = vortexMap.equity;
      const sp = vortexMap.spending;
      const nyc = vortexMap.nycdoc;
      const mort = vortexMap.mortality;
      const comm = vortexMap.community;
      if (!eq || !sp || !nyc || !mort || !comm) continue;

      let p0x = cx, p0y = cy, p1x = cx, p1y = cy, p2x = cx, p2y = cy;
      let colorKey = 'gold';
      let alpha = 0.55;

      const waveOff = Math.sin(d.t * Math.PI * 2 + this.time * 2.2 + d.phase) * 20 * d.lane;

      if (d.kind === 'individual_siphon') {
        // Human life/energy pulled out of the Core into Federal Spending as individuals enter the system
        p0x = cx;
        p0y = cy;
        p2x = sp.sx;
        p2y = sp.sy;
        p1x = lerp(cx, sp.sx, 0.48) + waveOff;
        p1y = lerp(cy, sp.sy, 0.52) - 42 + waveOff * 0.7;
        colorKey = d.t < 0.35 ? 'gold' : 'coral';
        alpha = clamp(0.32 + ch.spending.modulated * 0.48, 0.18, 0.9);
      } else if (d.kind === 'stock_inflow') {
        // Money pulled from Federal Spend & Core surging UP INTO Private Prison Stock (CXW/GEO)
        p0x = sp.sx;
        p0y = sp.sy;
        p2x = eq.sx;
        p2y = eq.sy;
        p1x = lerp(sp.sx, eq.sx, 0.4) + (d.lane > 0 ? 48 : -26) + waveOff;
        p1y = lerp(sp.sy, eq.sy, 0.55);
        colorKey = d.t < 0.28 ? 'coral' : 'amber';
        alpha = clamp(0.36 + ch.equity.modulated * 0.52 + this.contractFlash * 0.25, 0.2, 0.95);
      } else if (d.kind === 'custody_pull') {
        // NYC Pre-Trial Custody pulling weight directly into the center
        p0x = nyc.sx;
        p0y = nyc.sy;
        p2x = cx;
        p2y = cy;
        p1x = lerp(nyc.sx, cx, 0.5) - 24 + waveOff;
        p1y = lerp(nyc.sy, cy, 0.5) + 34;
        colorKey = 'violet';
        alpha = clamp(0.28 + (ch.nycdoc?.modulated || 0.4) * 0.5 + this.nycFlash * 0.2, 0.16, 0.9);
      } else if (d.kind === 'mortality_tear') {
        // Death grief & trauma ripping inward from Mortality node
        p0x = mort.sx;
        p0y = mort.sy;
        p2x = cx;
        p2y = cy;
        p1x = lerp(mort.sx, cx, 0.5) + Math.sin(this.time * 7 + d.phase) * 28;
        p1y = lerp(mort.sy, cy, 0.45) - 28;
        colorKey = this.deathFlash > 0.2 ? 'ember' : 'crimson';
        alpha = clamp(0.24 + ch.mortality.modulated * 0.48 + this.deathFlash * 0.45, 0.14, 0.98);
      } else if (d.kind === 'community_heal') {
        // Restorative water pouring back from Families & Courts into Center
        p0x = comm.sx;
        p0y = comm.sy;
        p2x = cx;
        p2y = cy;
        p1x = lerp(comm.sx, cx, 0.52) + waveOff;
        p1y = lerp(comm.sy, cy, 0.46) + 36;
        colorKey = Math.abs(d.lane) > 0.55 ? 'cyan' : 'teal';
        alpha = clamp(0.3 + sanctuary * 0.55 + ch.community.modulated * 0.2, 0.16, 0.92);
      }

      const t = d.t;
      const omt = 1 - t;
      let x = omt * omt * p0x + 2 * omt * t * p1x + t * t * p2x;
      let y = omt * omt * p0y + 2 * omt * t * p1y + t * t * p2y;

      const tx = 2 * omt * (p1x - p0x) + 2 * t * (p2x - p1x);
      const ty = 2 * omt * (p1y - p0y) + 2 * t * (p2y - p1y);
      const angle = Math.atan2(ty, tx);

      // Physical shockwave displacement bends active stream trajectories!
      d.shockOffsetX *= Math.pow(0.08, dt);
      d.shockOffsetY *= Math.pow(0.08, dt);
      for (const wave of this.shockwaves) {
        const wd = Math.hypot(x - wave.x, y - wave.y) + 1;
        const diff = Math.abs(wd - wave.radius);
        if (diff < wave.bandWidth) {
          const push = Math.cos((diff / wave.bandWidth) * Math.PI * 0.5) * wave.force * wave.alpha * 34;
          d.shockOffsetX += ((x - wave.x) / wd) * push * dt * 8;
          d.shockOffsetY += ((y - wave.y) / wd) * push * dt * 8;
        }
      }
      x += d.shockOffsetX;
      y += d.shockOffsetY;

      const env = Math.sin(t * Math.PI);
      const rx = d.size * (1.8 + Math.hypot(tx, ty) * 0.002);
      const ry = d.size * 0.62;
      this.drawSplat(ctx, colorKey, x, y, rx, ry, angle, alpha * (0.28 + env * 0.72));
    }
  }

  drawFluidSanctuaryCore(ctx, cx, cy, baseRadius, sanctuary, pressure, ch) {
    const coreRad = baseRadius * (0.76 + sanctuary * 0.52);
    const tearRatio = clamp(pressure / Math.max(0.25, sanctuary + 0.35), 0.1, 1.4);

    // Warm deep sanctuary bloom
    this.drawSplat(ctx, 'gold', cx, cy, coreRad * 1.85, coreRad * 1.7, this.time * 0.2, 0.15 + sanctuary * 0.16);
    this.drawSplat(ctx, 'cyan', cx, cy, coreRad * 1.35, coreRad * 1.45, -this.time * 0.28, 0.11 + sanctuary * 0.15);

    // Counter-rotating luminous water petals pulling against systemic tear
    const petals = 14;
    for (let i = 0; i < petals; i++) {
      const ang = (i / petals) * Math.PI * 2 + this.time * (0.35 + sanctuary * 0.3);
      const pullOut = tearRatio * (0.22 + 0.28 * Math.sin(this.time * 3.1 + i * 1.7));
      const r = coreRad * (0.58 + (i % 2) * 0.22 + pullOut * 0.38);
      const px = cx + Math.cos(ang) * r;
      const py = cy + Math.sin(ang) * r;

      const pKey = i % 3 === 0 ? 'cyan' : 'gold';
      this.drawSplat(
        ctx,
        pKey,
        px,
        py,
        coreRad * (0.52 + sanctuary * 0.22),
        coreRad * (0.22 + sanctuary * 0.08),
        ang + Math.PI * 0.5,
        0.12 + sanctuary * 0.14
      );

      // Opposing pressure claws tearing fissures at the perimeter
      if (i % 2 === 0 && pressure > 0.22) {
        const oppAng = -(i / petals) * Math.PI * 2 - this.time * (0.45 + pressure * 0.45);
        const or = coreRad * (1.02 + Math.sin(this.time * 4.5 + i) * 0.16);
        const ox = cx + Math.cos(oppAng) * or;
        const oy = cy + Math.sin(oppAng) * or;
        this.drawSplat(ctx, 'void', ox, oy, coreRad * 0.42, coreRad * 0.16, oppAng, clamp(0.28 + pressure * 0.38, 0.2, 0.78), 'source-over');
        this.drawSplat(
          ctx,
          this.deathFlash > 0.2 ? 'crimson' : 'coral',
          ox * 0.99 + cx * 0.01,
          oy,
          coreRad * (0.35 + tearRatio * 0.18),
          coreRad * 0.12,
          oppAng + 0.3,
          clamp(0.14 + pressure * 0.28 + this.deathFlash * 0.35, 0.1, 0.72)
        );
      }
    }

    // Soft organic fluid contour ripples (subtle translucent wave crests, never cold CAD bars)
    ctx.save();
    for (let ring = 0; ring < 2; ring++) {
      const pts = 72;
      ctx.beginPath();
      for (let i = 0; i <= pts; i++) {
        const theta = (i / pts) * Math.PI * 2;
        const ripple =
          Math.sin(theta * (3 + ring) + this.time * (1.1 + ring * 0.4)) * (6 + sanctuary * 10) +
          Math.cos(theta * 5 - this.time * 0.9) * (4 + ch.community.modulated * 6);
        const shear = Math.sin(theta * 11 + this.time * 6.5) * pressure * 9 * (ring === 0 ? 0.6 : 1.15);
        const rad = coreRad * (0.82 + ring * 0.26) + ripple + shear;
        const x = cx + Math.cos(theta) * rad;
        const y = cy + Math.sin(theta) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = ring === 0
        ? `rgba(255, 228, 178, ${0.22 + sanctuary * 0.32})`
        : `rgba(251, 113, 133, ${clamp(0.12 + pressure * 0.24, 0.08, 0.45)})`;
      ctx.lineWidth = ring === 0 ? 1.5 : 1.0;
      ctx.stroke();
    }

    // Bright living core heart
    this.drawSplat(ctx, 'ember', cx, cy, coreRad * 0.34, coreRad * 0.34, 0, 0.22 + sanctuary * 0.24);
    ctx.restore();
  }

  drawFluidDataVortices(ctx, w, h, cx, cy, vortices) {
    this.nodeHitboxes = [];
    const isNarrow = w < 640;

    for (const v of vortices) {
      const isSelected = this.selectedSection === v.key;
      const isHovered = this.hoveredNode === v.key;
      const hasSelection = Boolean(this.selectedSection);
      const dim = hasSelection && !isSelected && !isHovered ? 0.48 : 1.0;

      // Energy circle radius visibly swells with data level, pulses, and money inflow
      const baseR = (isNarrow ? 26 : 36) * (0.86 + v.level * 0.48 + v.pulse * 0.35);

      // Dark fluid pocket underneath for depth contrast
      this.drawSplat(ctx, 'void', v.sx, v.sy, baseR * 1.45, baseR * 1.45, 0, 0.42 * dim, 'source-over');

      // Core Gaussian vortex bloom
      this.drawSplat(ctx, v.colorKey, v.sx, v.sy, baseR * 1.25, baseR * 1.25, 0, (0.24 + v.level * 0.22) * dim);

      // 7 orbiting anisotropic Gaussian eddies forming a liquid circle of energy
      for (let e = 0; e < 7; e++) {
        const ang = (e / 7) * Math.PI * 2 + this.time * (0.85 + v.level * 1.1) * (v.key === 'community' ? -1 : 1);
        const orbitR = baseR * (0.48 + Math.sin(this.time * 2.5 + e) * 0.08);
        const ex = v.sx + Math.cos(ang) * orbitR;
        const ey = v.sy + Math.sin(ang) * orbitR;
        this.drawSplat(
          ctx,
          v.colorKey,
          ex,
          ey,
          baseR * 0.56,
          baseR * 0.24,
          ang + Math.PI * 0.5,
          (0.18 + v.pulse * 0.24) * dim
        );
      }

      // Hot inner center
      this.drawSplat(ctx, 'ember', v.sx, v.sy, baseR * 0.3, baseR * 0.3, 0, (0.16 + v.pulse * 0.28) * dim);

      if (isSelected || isHovered) {
        ctx.save();
        ctx.strokeStyle = isSelected ? 'rgba(232, 184, 109, 0.85)' : 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(v.sx, v.sy, baseR * 0.92, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Always register circular vortex hitbox so even in NO TEXT mode the user can click to inspect
      if (this.viewMode === 'pure') {
        this.nodeHitboxes.push({
          key: v.key,
          cx: v.sx,
          cy: v.sy,
          radius: baseR * 1.05,
          x: v.sx - baseR,
          y: v.sy - baseR,
          w: baseR * 2,
          h: baseR * 2
        });
        continue;
      }

      // Floating organic label beside/below vortex (no harsh CAD boxes)
      ctx.save();
      ctx.font = `700 ${isNarrow ? 9 : 10}px "IBM Plex Mono", monospace`;
      const titleW = ctx.measureText(v.title).width;
      ctx.font = `600 ${isNarrow ? 8.5 : 9.5}px "IBM Plex Mono", monospace`;
      const metricW = ctx.measureText(v.metric).width;

      const alignRight = v.sx > cx;
      const textW = Math.max(titleW, metricW) + 14;
      const offsetX = alignRight ? -textW - baseR * 0.38 : baseR * 0.45;
      const lx = isNarrow
        ? (alignRight
          ? clamp(v.sx + 20 - textW, Math.min(cx + 4, w - textW - 6), w - textW - 6)
          : clamp(v.sx - 20, 6, Math.max(6, cx - textW - 4)))
        : clamp(v.sx + offsetX, 8, w - textW - 8);
      const ly = clamp(v.sy - 14, 24, h - 54);

      this.nodeHitboxes.push({
        key: v.key,
        cx: v.sx,
        cy: v.sy,
        radius: baseR * 1.05,
        x: Math.min(lx, v.sx - baseR * 0.7),
        y: Math.min(ly - 6, v.sy - baseR * 0.7),
        w: Math.max(textW, baseR * 1.4),
        h: Math.max(36, baseR * 1.4)
      });

      // Soft translucent pill behind floating text
      ctx.globalAlpha = (isSelected || isHovered ? 0.96 : 0.78) * dim;
      ctx.fillStyle = 'rgba(6, 8, 14, 0.68)';
      ctx.beginPath();
      ctx.roundRect?.(lx - 4, ly - 10, textW + 4, 34, 8);
      if (!ctx.roundRect) ctx.rect(lx - 4, ly - 10, textW + 4, 34);
      ctx.fill();

      ctx.globalAlpha = dim;
      ctx.fillStyle = v.colorHex;
      ctx.font = `700 ${isNarrow ? 9 : 10}px "IBM Plex Mono", monospace`;
      ctx.fillText(v.title, lx + 3, ly + 2);

      ctx.fillStyle = '#eef2f6';
      ctx.font = `600 ${isNarrow ? 8.5 : 9.5}px "IBM Plex Mono", monospace`;
      ctx.fillText(v.metric, lx + 3, ly + 15);
      ctx.restore();
    }
  }

  drawShockwaves(ctx, dt) {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += s.speed * dt;
      s.alpha -= dt * 0.62;
      if (s.alpha <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      // Soft Gaussian wave-ring halo + turbulent wave splats around perimeter
      const segments = 18;
      for (let k = 0; k < segments; k++) {
        const ang = (k / segments) * Math.PI * 2 + this.time * 0.5;
        const wobble = Math.sin(ang * 5 + this.time * 12) * 7 * s.alpha;
        const r = Math.max(4, s.radius + wobble);
        const sx = s.x + Math.cos(ang) * r;
        const sy = s.y + Math.sin(ang) * r;
        this.drawSplat(
          ctx,
          s.colorKey,
          sx,
          sy,
          clamp(s.radius * 0.24, 14, 52),
          10 + s.alpha * 10,
          ang + Math.PI * 0.5,
          s.alpha * 0.42
        );
      }

      ctx.save();
      ctx.strokeStyle = s.colorHex;
      ctx.globalAlpha = s.alpha * 0.55;
      ctx.lineWidth = 1.4 + s.alpha * 1.8;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  updateAndDrawAscendingSouls(ctx, dt, w, h, hudBottom) {
    const starYMin = hudBottom + 16;
    for (let i = this.ascendingSouls.length - 1; i >= 0; i--) {
      const soul = this.ascendingSouls[i];
      soul.t += dt * soul.speed;
      if (soul.t >= 1) {
        this.ascendingSouls.splice(i, 1);
        continue;
      }

      const tx = soul.targetNx * w;
      const ty = Math.max(starYMin, soul.targetNy * h);
      const ease = 1 - Math.pow(1 - soul.t, 2.2);
      const x = lerp(soul.startX, tx, ease) + Math.sin(soul.t * Math.PI * 3) * 18 * (1 - ease);
      const y = lerp(soul.startY, ty, ease);

      const alpha = Math.sin(soul.t * Math.PI * 0.85 + 0.15);
      this.drawSplat(ctx, 'crimson', x, y + 10, 14, 24, 0, alpha * 0.52);
      this.drawSplat(ctx, 'ember', x, y, 10, 14, 0, alpha * 0.85);
    }
  }

  drawMemorialSky(ctx, w, h, hudBottom) {
    const starYMin = hudBottom + 16;
    ctx.save();
    for (let i = 0; i < this.memorialStars.length; i++) {
      const star = this.memorialStars[i];
      const sx = star.nx * w;
      const sy = Math.max(starYMin, star.ny * h);
      const ageSec = this.time - star.bornAt;
      const twinkle = 0.65 + 0.35 * Math.sin(this.time * 2.1 + star.phase);
      const isHovered = this.hoveredStar && this.hoveredStar.bornAt === star.bornAt;

      if (i > 0) {
        const prev = this.memorialStars[i - 1];
        const psy = Math.max(starYMin, prev.ny * h);
        ctx.strokeStyle = 'rgba(232, 184, 109, 0.11)';
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(prev.nx * w, psy);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }

      const halo = isHovered ? 22 : ageSec < 3 ? 18 : 11;
      this.drawSplat(ctx, 'crimson', sx, sy, halo, halo, 0, 0.45 * twinkle);
      this.drawSplat(ctx, 'ember', sx, sy, halo * 0.55, halo * 0.55, 0, 0.85 * twinkle);

      ctx.fillStyle = isHovered ? '#ffffff' : '#ffe5c2';
      ctx.beginPath();
      ctx.arc(sx, sy, isHovered ? 3.2 : 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  updateAndDrawTouchRipples(ctx, dt) {
    for (let i = this.touchRipples.length - 1; i >= 0; i--) {
      const r = this.touchRipples[i];
      r.radius += dt * 78;
      r.alpha -= dt * 1.1;
      if (r.alpha <= 0) {
        this.touchRipples.splice(i, 1);
        continue;
      }
      this.drawSplat(ctx, r.colorKey, r.x, r.y, r.radius, r.radius * 0.7, Math.atan2(r.dy, r.dx), r.alpha * 0.45);
    }
  }

  drawFluidWaveHorizon(ctx, w, h, synth, sanctuary, pressure) {
    const scopeY = h * 0.88;
    const scopeAmp = clamp(h * 0.065, 16, 36);

    const outWave = synth.getWaveformData();
    const sanctuaryWave = synth.getSanctuaryWaveData();
    const freqData = synth.getFrequencyData();

    ctx.save();

    // Soft bioluminescent frequency splats along bottom tide (replaces rectangular bar charts)
    if (freqData && synth.initialized && !synth.muted) {
      const crestCount = 24;
      for (let i = 0; i < crestCount; i++) {
        const bin = Math.floor(Math.pow(i / crestCount, 1.45) * (freqData.length * 0.42));
        const mag = freqData[bin] / 255;
        if (mag < 0.05) continue;
        const x = ((i + 0.5) / crestCount) * w;
        const y = scopeY + Math.sin(i * 0.7 + this.time * 2) * 8;
        this.drawSplat(ctx, mag > 0.55 ? 'coral' : 'cyan', x, y, (w / crestCount) * 0.9, 10 + mag * scopeAmp * 0.85, 0, 0.14 + mag * 0.22);
      }
    }

    // Sanctuary fluid tide
    ctx.beginPath();
    const samples = 140;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const x = t * w;
      let yOffset;
      if (sanctuaryWave && synth.initialized && !synth.muted) {
        const idx = Math.floor(t * (sanctuaryWave.length - 1));
        yOffset = ((sanctuaryWave[idx] - 128) / 128) * scopeAmp * 0.9;
      } else {
        yOffset = Math.sin(t * Math.PI * 5 + this.time * 1.6) * scopeAmp * (0.28 + sanctuary * 0.42);
      }
      if (i === 0) ctx.moveTo(x, scopeY + yOffset);
      else ctx.lineTo(x, scopeY + yOffset);
    }
    ctx.strokeStyle = 'rgba(232, 184, 109, 0.36)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Systemic opposing tide
    ctx.beginPath();
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const x = t * w;
      let yOffset;
      if (outWave && synth.initialized && !synth.muted) {
        const idx = Math.floor(t * (outWave.length - 1));
        yOffset = ((outWave[idx] - 128) / 128) * scopeAmp;
      } else {
        yOffset = Math.sin(t * Math.PI * 8 - this.time * 2.4) * scopeAmp * 0.28 * (0.5 + pressure);
      }
      if (i === 0) ctx.moveTo(x, scopeY + yOffset);
      else ctx.lineTo(x, scopeY + yOffset);
    }
    ctx.strokeStyle = this.deathFlash > 0.25
      ? `rgba(255, 51, 75, ${0.55 + this.deathFlash * 0.4})`
      : `rgba(92, 225, 230, ${0.32 + sanctuary * 0.28})`;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.restore();
  }
}
