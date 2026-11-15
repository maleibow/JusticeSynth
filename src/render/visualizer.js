/**
 * JUSTICE SYNTH — Visual-First Stage Telemetry & Data Node Renderer
 *
 * Focuses strictly on visual clarity and data interaction:
 *  - Central Human Core vs. Constricting Carceral Cage
 *  - 4 Interactive Visual Data Nodes (clickable to highlight & inspect)
 *  - Memorial Constellation in the upper sky for every custody death record
 *  - Dual Waveform Horizon (unfiltered human wave vs. pressured system output)
 */

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export class TelemetryVisualizer {
  constructor(canvas, tooltipEl, onNodeSelect = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tooltipEl = tooltipEl;
    this.onNodeSelect = onNodeSelect;

    this.width = 1280;
    this.height = 640;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.time = 0;
    this.deathFlash = 0;
    this.contractFlash = 0;
    this.shockwaves = [];
    this.memorialStars = [];
    this.particles = [];
    this.hoveredStar = null;

    this.selectedSection = null;
    this.hoveredNode = null;
    this.nodeHitboxes = [];

    this.pointerX = -999;
    this.pointerY = -999;

    this.initAmbientParticles();
    this.resize();
    this.bindPointerEvents();
  }

  setSelectedSection(sectionKey) {
    this.selectedSection = sectionKey;
  }

  initAmbientParticles() {
    for (let i = 0; i < 42; i++) {
      this.particles.push({
        angle: Math.random() * Math.PI * 2,
        dist: 0.16 + Math.random() * 0.34,
        speed: (0.04 + Math.random() * 0.12) * (Math.random() > 0.5 ? 1 : -1),
        size: 1 + Math.random() * 1.8,
        alpha: 0.15 + Math.random() * 0.35
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
      this.pointerX = clientX - rect.left;
      this.pointerY = clientY - rect.top;
      this.checkStarHover();
      this.checkNodeHover();
    };

    this.canvas.addEventListener('pointermove', (e) => {
      updatePos(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      updatePos(e.clientX, e.clientY);
      if (this.hoveredNode && typeof this.onNodeSelect === 'function') {
        this.onNodeSelect(this.hoveredNode);
      }
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.pointerX = -999;
      this.pointerY = -999;
      this.hoveredStar = null;
      this.hoveredNode = null;
      this.canvas.style.cursor = 'default';
      if (this.tooltipEl) this.tooltipEl.classList.add('hidden');
    });
  }

  checkNodeHover() {
    let hit = null;
    for (const box of this.nodeHitboxes) {
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
    this.canvas.style.cursor = hit || this.hoveredStar ? 'pointer' : 'default';
  }

  checkStarHover() {
    if (!this.tooltipEl) return;
    let closest = null;
    let minDist = 18;
    for (const star of this.memorialStars) {
      const sx = star.nx * this.width;
      const sy = star.ny * this.height;
      const d = Math.hypot(this.pointerX - sx, this.pointerY - sy);
      if (d < minDist) {
        minDist = d;
        closest = star;
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
    const ty = clamp(closest.ny * this.height - 20, 10, Math.max(20, this.height - 130));
    this.tooltipEl.style.left = `${tx}px`;
    this.tooltipEl.style.top = `${ty}px`;
    this.tooltipEl.classList.remove('hidden');
  }

  triggerDeathShock(record) {
    this.deathFlash = 1.0;
    const cx = this.width * 0.5;
    const cy = this.height * 0.45;
    this.shockwaves.push({
      x: cx,
      y: cy,
      radius: 18,
      alpha: 1.0,
      color: '#ff334b',
      speed: 280
    });

    const idx = this.memorialStars.length;
    const nx = clamp(0.16 + ((idx * 0.173) % 0.68) + (Math.random() - 0.5) * 0.04, 0.1, 0.9);
    const ny = clamp(0.11 + ((idx * 0.089) % 0.18), 0.09, 0.30);

    this.memorialStars.push({
      nx,
      ny,
      record,
      bornAt: this.time,
      phase: Math.random() * Math.PI * 2
    });
    if (this.memorialStars.length > 72) {
      this.memorialStars.shift();
    }
  }

  triggerContractPulse() {
    this.contractFlash = 0.85;
    this.shockwaves.push({
      x: this.width * 0.5,
      y: this.height * 0.45,
      radius: 28,
      alpha: 0.75,
      color: '#fb7185',
      speed: 190
    });
  }

  render(dt, snapshot, synth) {
    const safeDt = Math.min(dt, 0.05);
    this.time += safeDt;
    this.deathFlash = Math.max(0, this.deathFlash - safeDt * 1.45);
    this.contractFlash = Math.max(0, this.contractFlash - safeDt * 1.1);

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    ctx.fillStyle = this.deathFlash > 0.1
      ? `rgba(26, 7, 12, ${0.42 + this.deathFlash * 0.25})`
      : 'rgba(7, 8, 12, 0.56)';
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.45;
    const minDim = Math.min(w, h);
    const baseRadius = clamp(minDim * 0.19, 46, 126);

    const synthState = synth.state;
    const sanctuary = synthState.sanctuaryStrength;
    const pressure = synthState.systemicPressure;
    const ch = snapshot.channels;

    this.drawCoordinateField(ctx, cx, cy, w, h, pressure);
    this.drawMemorialSky(ctx, w, h);
    this.drawDataNodes(ctx, w, h, cx, cy, snapshot);
    this.drawSanctuaryCore(ctx, cx, cy, baseRadius, sanctuary, pressure, ch.community.modulated);
    this.drawCarceralCage(ctx, cx, cy, baseRadius, sanctuary, pressure, ch);
    this.drawShockwaves(ctx, safeDt);
    this.drawDualOscilloscope(ctx, w, h, synth, sanctuary, pressure);

    if (this.deathFlash > 0.05) {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 51, 75, ${this.deathFlash * 0.85})`;
      ctx.lineWidth = 1 + this.deathFlash * 2.5;
      const yTear = cy + (Math.random() - 0.5) * 40;
      ctx.beginPath();
      ctx.moveTo(0, yTear);
      for (let x = 0; x <= w; x += 28) {
        ctx.lineTo(x, yTear + (Math.random() - 0.5) * 26 * this.deathFlash);
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  drawCoordinateField(ctx, cx, cy, w, h, pressure) {
    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.028 + pressure * 0.022})`;
    ctx.lineWidth = 1;

    for (let r = 85; r < Math.max(w, h) * 0.7; r += 90) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + this.time * 0.014;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 44, cy + Math.sin(ang) * 44);
      ctx.lineTo(cx + Math.cos(ang) * Math.max(w, h), cy + Math.sin(ang) * Math.max(w, h));
      ctx.stroke();
    }
    ctx.restore();
  }

  drawMemorialSky(ctx, w, h) {
    ctx.save();
    for (let i = 0; i < this.memorialStars.length; i++) {
      const star = this.memorialStars[i];
      const sx = star.nx * w;
      const sy = star.ny * h;
      const ageSec = this.time - star.bornAt;
      const twinkle = 0.65 + 0.35 * Math.sin(this.time * 2.1 + star.phase);
      const isHovered = this.hoveredStar === star;

      if (i > 0) {
        const prev = this.memorialStars[i - 1];
        ctx.strokeStyle = 'rgba(232, 184, 109, 0.09)';
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(prev.nx * w, prev.ny * h);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }

      const glowRadius = isHovered ? 16 : ageSec < 3 ? 13 : 8;
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowRadius);
      grad.addColorStop(0, `rgba(255, 214, 165, ${0.95 * twinkle})`);
      grad.addColorStop(0.35, `rgba(255, 77, 109, ${0.45 * twinkle})`);
      grad.addColorStop(1, 'rgba(255, 51, 75, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isHovered ? '#ffffff' : '#ffe5c2';
      ctx.beginPath();
      ctx.arc(sx, sy, isHovered ? 3.2 : 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawSanctuaryCore(ctx, cx, cy, baseRadius, sanctuary, pressure, communityMod) {
    ctx.save();
    const coreRadius = baseRadius * (0.68 + sanctuary * 0.58);

    const glow = ctx.createRadialGradient(cx, cy, coreRadius * 0.1, cx, cy, coreRadius * 1.9);
    glow.addColorStop(0, `rgba(232, 184, 109, ${0.28 + sanctuary * 0.34})`);
    glow.addColorStop(0.55, `rgba(92, 225, 230, ${0.09 + sanctuary * 0.18})`);
    glow.addColorStop(1, 'rgba(7, 8, 12, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, coreRadius * 1.9, 0, Math.PI * 2);
    ctx.fill();

    for (let ring = 0; ring < 3; ring++) {
      const rScale = 0.72 + ring * 0.19;
      const points = 96;
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const theta = (i / points) * Math.PI * 2;
        const harmonic =
          Math.sin(theta * (3 + ring) + this.time * (0.9 + ring * 0.35)) * (5 + sanctuary * 11) +
          Math.cos(theta * 5 - this.time * 0.7) * (3 + communityMod * 7);
        const intrusion = Math.max(0, pressure - sanctuary * 0.75) *
          Math.sin(theta * 19 + this.time * 9) * 8;

        const rad = coreRadius * rScale + harmonic + intrusion;
        const x = cx + Math.cos(theta) * rad;
        const y = cy + Math.sin(theta) * rad;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = ring === 1
        ? `rgba(92, 225, 230, ${0.32 + sanctuary * 0.48})`
        : `rgba(232, 184, 109, ${0.38 + sanctuary * 0.5})`;
      ctx.lineWidth = ring === 0 ? 2.2 : 1.3;
      ctx.stroke();
    }

    for (const p of this.particles) {
      p.angle += p.speed * 0.016 * (0.6 + sanctuary);
      const dist = baseRadius * (0.95 + p.dist * (0.8 + sanctuary));
      const px = cx + Math.cos(p.angle) * dist;
      const py = cy + Math.sin(p.angle) * dist;
      ctx.fillStyle = `rgba(232, 184, 109, ${p.alpha * (0.4 + sanctuary * 0.6)})`;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawCarceralCage(ctx, cx, cy, baseRadius, sanctuary, pressure, ch) {
    ctx.save();
    const cageRadius = baseRadius * clamp(1.52 - pressure * 0.44 + sanctuary * 0.16, 0.72, 1.75);
    const bars = 24;

    for (let i = 0; i < bars; i++) {
      const ang = (i / bars) * Math.PI * 2 + this.time * (0.04 + ch.equity.modulated * 0.18);
      const jitter = (ch.mortality.pulse * 8 + ch.equity.modulated * 4) * Math.sin(this.time * 24 + i * 3);
      const innerR = cageRadius * 0.86 + jitter;
      const outerR = cageRadius * 1.24 + ch.spending.modulated * 18;

      ctx.strokeStyle = this.deathFlash > 0.25
        ? `rgba(255, 51, 75, ${0.55 + this.deathFlash * 0.4})`
        : `rgba(251, 113, 133, ${clamp(0.18 + pressure * 0.45, 0.12, 0.78)})`;
      ctx.lineWidth = i % 2 === 0 ? 1.8 : 0.9;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * innerR, cy + Math.sin(ang) * innerR);
      ctx.lineTo(cx + Math.cos(ang) * outerR, cy + Math.sin(ang) * outerR);
      ctx.stroke();
    }

    const sides = 12;
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const ang = (i / sides) * Math.PI * 2 - this.time * 0.14;
      const r = cageRadius + Math.sin(i * 4 + this.time * 5) * (ch.equity.modulated * 14);
      const x = cx + Math.cos(ang) * r;
      const y = cy + Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(245, 158, 11, ${clamp(0.22 + pressure * 0.42, 0.15, 0.75)})`;
    ctx.lineWidth = 1.25;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draws 5 concise, clickable visual Data Nodes feeding the central visualization.
   */
  drawDataNodes(ctx, w, h, cx, cy, snapshot) {
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

    const leftX = isNarrow ? 10 : w * 0.12;
    const rightX = isNarrow ? w - 10 : w * 0.88;

    const nodes = [
      {
        key: 'equity',
        sx: leftX,
        sy: h * 0.25,
        color: '#f59e0b',
        level: ch.equity.modulated,
        pulse: ch.equity.pulse,
        title: 'PRISON STOCK',
        metric: `CXW $${snapshot.stocks.cxw.price.toFixed(2)} · GEO $${snapshot.stocks.geo.price.toFixed(2)}`
      },
      {
        key: 'spending',
        sx: leftX,
        sy: h * 0.45,
        color: '#fb7185',
        level: ch.spending.modulated,
        pulse: ch.spending.pulse,
        title: 'FEDERAL SPEND',
        metric: `${contractAmt} · $2,561/sec`
      },
      {
        key: 'nycdoc',
        sx: leftX,
        sy: h * 0.65,
        color: '#a78bfa',
        level: nycdocChannel.modulated,
        pulse: nycdocChannel.pulse,
        title: 'NYC CUSTODY',
        metric: `${nycTotal.toLocaleString('en-US')} HELD · ${nycPretrialPct}% PRE-TRIAL`
      },
      {
        key: 'mortality',
        sx: rightX,
        sy: h * 0.30,
        color: '#ff334b',
        level: ch.mortality.modulated,
        pulse: ch.mortality.pulse,
        title: 'CUSTODY DEATHS',
        metric: `${snapshot.loggedDeathsCount} LOGGED`
      },
      {
        key: 'community',
        sx: rightX,
        sy: h * 0.58,
        color: '#34d399',
        level: ch.community.modulated,
        pulse: ch.community.pulse,
        title: 'COURTS & FAMILIES',
        metric: '2.7M CHILDREN'
      }
    ];

    this.nodeHitboxes = [];
    ctx.save();

    for (const n of nodes) {
      const isSelected = this.selectedSection === n.key;
      const isHovered = this.hoveredNode === n.key;
      const hasSelection = Boolean(this.selectedSection);
      const dimFactor = hasSelection && !isSelected && !isHovered ? 0.42 : 1.0;

      const alpha = clamp((0.25 + n.level * 0.45 + n.pulse * 0.3) * dimFactor, 0.12, 0.98);
      ctx.strokeStyle = n.color;
      ctx.globalAlpha = alpha * (isSelected ? 0.92 : 0.55);
      ctx.lineWidth = isSelected ? 2.4 : 1 + n.level * 1.6;

      ctx.beginPath();
      ctx.moveTo(n.sx, n.sy);
      ctx.quadraticCurveTo((n.sx + cx) * 0.5, n.sy, cx, cy);
      ctx.stroke();

      // Traveling signal dot
      const t = (this.time * (0.45 + n.level * 0.85)) % 1;
      const mx = (1 - t) * (1 - t) * n.sx + 2 * (1 - t) * t * ((n.sx + cx) * 0.5) + t * t * cx;
      const my = (1 - t) * (1 - t) * n.sy + 2 * (1 - t) * t * n.sy + t * t * cy;
      ctx.globalAlpha = dimFactor;
      ctx.fillStyle = n.color;
      ctx.beginPath();
      ctx.arc(mx, my, (isSelected ? 3.8 : 2.6) + n.pulse * 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Compact Interactive Node Pill
      ctx.font = `700 ${isNarrow ? 9.5 : 10.5}px "IBM Plex Mono", monospace`;
      const titleW = ctx.measureText(n.title).width;
      ctx.font = `${isNarrow ? 9 : 10}px "IBM Plex Mono", monospace`;
      const metricW = ctx.measureText(n.metric).width;

      const boxW = Math.max(titleW, metricW) + 18;
      const boxH = 34;
      const alignRight = n.sx > cx;
      const bx = alignRight ? clamp(n.sx - boxW, 8, w - boxW - 8) : clamp(n.sx, 8, w - boxW - 8);
      const by = clamp(n.sy - boxH * 0.5, isNarrow ? 76 : 52, h - 98);

      this.nodeHitboxes.push({ key: n.key, x: bx, y: by, w: boxW, h: boxH });

      ctx.globalAlpha = isSelected || isHovered ? 0.98 : 0.86 * dimFactor;
      ctx.fillStyle = isSelected ? 'rgba(26, 30, 42, 0.96)' : 'rgba(9, 12, 18, 0.88)';
      ctx.fillRect(bx, by, boxW, boxH);
      ctx.strokeStyle = isSelected ? '#e8b86d' : n.color;
      ctx.lineWidth = isSelected || isHovered ? 1.6 : 0.9;
      ctx.strokeRect(bx, by, boxW, boxH);

      ctx.globalAlpha = dimFactor;
      ctx.fillStyle = n.color;
      ctx.font = `700 ${isNarrow ? 9.5 : 10.5}px "IBM Plex Mono", monospace`;
      ctx.fillText(n.title, bx + 9, by + 13);

      ctx.fillStyle = '#eef2f6';
      ctx.font = `${isNarrow ? 9 : 10}px "IBM Plex Mono", monospace`;
      ctx.fillText(n.metric, bx + 9, by + 27);
    }

    ctx.restore();
  }

  drawShockwaves(ctx, dt) {
    ctx.save();
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += s.speed * dt;
      s.alpha -= dt * 0.72;
      if (s.alpha <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = s.alpha;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawDualOscilloscope(ctx, w, h, synth, sanctuary, pressure) {
    const scopeY = h * 0.79;
    const scopeAmp = clamp(h * 0.08, 20, 44);

    const outWave = synth.getWaveformData();
    const sanctuaryWave = synth.getSanctuaryWaveData();
    const freqData = synth.getFrequencyData();

    ctx.save();

    if (freqData) {
      const barCount = 72;
      const barW = w / barCount;
      for (let i = 0; i < barCount; i++) {
        const bin = Math.floor(Math.pow(i / barCount, 1.5) * (freqData.length * 0.45));
        const mag = freqData[bin] / 255;
        const bh = mag * scopeAmp * 1.4;
        ctx.fillStyle = `rgba(92, 225, 230, ${0.05 + mag * 0.13})`;
        ctx.fillRect(i * barW, scopeY + scopeAmp * 0.65 - bh, barW - 1.5, bh);
      }
    }

    ctx.beginPath();
    const samples = 180;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const x = t * w;
      let yOffset;
      if (sanctuaryWave && synth.initialized && !synth.muted) {
        const idx = Math.floor(t * (sanctuaryWave.length - 1));
        yOffset = ((sanctuaryWave[idx] - 128) / 128) * scopeAmp * 0.95;
      } else {
        yOffset = Math.sin(t * Math.PI * 6 + this.time * 1.8) * scopeAmp * 0.45 * sanctuary;
      }
      if (i === 0) ctx.moveTo(x, scopeY + yOffset);
      else ctx.lineTo(x, scopeY + yOffset);
    }
    ctx.strokeStyle = 'rgba(232, 184, 109, 0.42)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const x = t * w;
      let yOffset;
      if (outWave && synth.initialized && !synth.muted) {
        const idx = Math.floor(t * (outWave.length - 1));
        yOffset = ((outWave[idx] - 128) / 128) * scopeAmp * 1.15;
      } else {
        const clean = Math.sin(t * Math.PI * 6 + this.time * 1.8) * 0.4;
        const crush = Math.sin(t * Math.PI * 26 + this.time * 7) * 0.25 * pressure;
        yOffset = (clean + crush) * scopeAmp;
      }
      if (i === 0) ctx.moveTo(x, scopeY + yOffset);
      else ctx.lineTo(x, scopeY + yOffset);
    }
    ctx.strokeStyle = pressure > sanctuary ? 'rgba(255, 77, 109, 0.88)' : 'rgba(92, 225, 230, 0.85)';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    ctx.restore();
  }
}
