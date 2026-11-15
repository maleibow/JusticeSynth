/**
 * CELL // SIGNAL — High-DPI Stage Telemetry & Synth Visualizer
 *
 * Explicitly renders:
 *  - Sanctuary Core (warm golden/cyan harmonic beauty underneath)
 *  - Constricting Carceral Cage (radial iron bars & FM geometric distortion)
 *  - 4 Explicit Telemetry Signal Conduits with live [DATA ──► SYNTH PARAM] callouts
 *  - Dual Oscilloscope (Ideal Sanctuary Wave ghosted behind Crushed Output Wave)
 *  - Interactive Memorial Constellation for every logged Custody Death Record
 */

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export class TelemetryVisualizer {
  constructor(canvas, tooltipEl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tooltipEl = tooltipEl;

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

    this.pointerX = -999;
    this.pointerY = -999;

    this.initAmbientParticles();
    this.resize();
    this.bindPointerEvents();
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
    };

    this.canvas.addEventListener('pointermove', (e) => {
      updatePos(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      updatePos(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.pointerX = -999;
      this.pointerY = -999;
      this.hoveredStar = null;
      if (this.tooltipEl) this.tooltipEl.classList.add('hidden');
    });
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
      <div>Days Incarcerated: <strong>${r.days_incarcerated}</strong></div>
      <div style="color:#98a2b3;margin-top:3px;">Cause: ${r.cause_of_death}</div>
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
    const cy = this.height * 0.44;
    this.shockwaves.push({
      x: cx,
      y: cy,
      radius: 18,
      alpha: 1.0,
      color: '#ff334b',
      speed: 280
    });

    // Place a persistent star in the upper memorial sky
    const idx = this.memorialStars.length;
    const nx = clamp(0.14 + ((idx * 0.173) % 0.72) + (Math.random() - 0.5) * 0.04, 0.08, 0.92);
    const ny = clamp(0.12 + ((idx * 0.089) % 0.22), 0.09, 0.36);

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
      y: this.height * 0.44,
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

    // Clear subtle trail background
    ctx.fillStyle = this.deathFlash > 0.1
      ? `rgba(26, 7, 12, ${0.42 + this.deathFlash * 0.25})`
      : 'rgba(7, 8, 12, 0.55)';
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.44;
    const minDim = Math.min(w, h);
    const baseRadius = clamp(minDim * 0.18, 48, 118);

    const synthState = synth.state;
    const sanctuary = synthState.sanctuaryStrength;
    const pressure = synthState.systemicPressure;
    const ch = snapshot.channels;

    // 1. Subtle architectural radial coordinate grid
    this.drawCoordinateField(ctx, cx, cy, w, h, pressure);

    // 2. Memorial Constellation (Upper Sky)
    this.drawMemorialSky(ctx, w, h);

    // 3. Explicit Signal Conduits from 4 Data Channels -> Core
    this.drawSignalConduits(ctx, w, h, cx, cy, snapshot, synthState);

    // 4. Centerpiece: Sanctuary Harmonic Core vs. Carceral Cage
    this.drawSanctuaryCore(ctx, cx, cy, baseRadius, sanctuary, pressure, ch.community.modulated);
    this.drawCarceralCage(ctx, cx, cy, baseRadius, sanctuary, pressure, ch);

    // 5. Shockwaves on Death / Contract Events
    this.drawShockwaves(ctx, safeDt);

    // 6. Dual Waveform & Spectrum Horizon
    this.drawDualOscilloscope(ctx, w, h, synth, sanctuary, pressure);

    // 7. Stark Horizontal Fault-Line Tear on Custody Death
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
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.03 + pressure * 0.025})`;
    ctx.lineWidth = 1;

    for (let r = 80; r < Math.max(w, h) * 0.7; r += 85) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Panopticon sightlines
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + this.time * 0.015;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 40, cy + Math.sin(ang) * 40);
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

      // Subtle line linking recent memorial star down toward horizon
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

    // Warm Golden & Cyan Harmonic Glow underneath
    const glow = ctx.createRadialGradient(cx, cy, coreRadius * 0.1, cx, cy, coreRadius * 1.9);
    glow.addColorStop(0, `rgba(232, 184, 109, ${0.28 + sanctuary * 0.34})`);
    glow.addColorStop(0.55, `rgba(92, 225, 230, ${0.09 + sanctuary * 0.18})`);
    glow.addColorStop(1, 'rgba(7, 8, 12, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, coreRadius * 1.9, 0, Math.PI * 2);
    ctx.fill();

    // 3 Harmonic Standing-Wave Choir Ribbons
    for (let ring = 0; ring < 3; ring++) {
      const rScale = 0.72 + ring * 0.19;
      const points = 96;
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const theta = (i / points) * Math.PI * 2;
        const harmonic =
          Math.sin(theta * (3 + ring) + this.time * (0.9 + ring * 0.35)) * (5 + sanctuary * 11) +
          Math.cos(theta * 5 - this.time * 0.7) * (3 + communityMod * 7);
        // Systemic jaggedness intrudes when pressure > sanctuary
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

    // Orbiting sanctuary embers
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
    // Cage contracts inward as systemic pressure increases and expands slightly when sanctuary pushes back
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

    // Polygon FM / Wavefolder Distortion Ring
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

  drawSignalConduits(ctx, w, h, cx, cy, snapshot, synthState) {
    const ch = snapshot.channels;
    const isNarrow = w < 640;

    const conduits = [
      {
        sx: w * 0.10,
        sy: h * 0.25,
        color: '#f59e0b',
        level: ch.equity.modulated,
        pulse: ch.equity.pulse,
        label: isNarrow
          ? `CXW/GEO ──► FM ${(synthState.effectiveFmIndex * 100).toFixed(0)}%`
          : `CH1 CXW $${snapshot.stocks.cxw.price.toFixed(2)} · GEO $${snapshot.stocks.geo.price.toFixed(2)} ──► FM ${(synthState.effectiveFmIndex * 100).toFixed(0)}% / COMB ${(synthState.effectiveComb * 100).toFixed(0)}%`
      },
      {
        sx: w * 0.10,
        sy: h * 0.64,
        color: '#fb7185',
        level: ch.spending.modulated,
        pulse: ch.spending.pulse,
        label: isNarrow
          ? `USASPEND ──► FOLD ${(synthState.effectiveFold * 100).toFixed(0)}%`
          : `CH2 USASPENDING ($2,560/s) ──► WAVEFOLD ${(synthState.effectiveFold * 100).toFixed(0)}% / SUB`
      },
      {
        sx: w * 0.90,
        sy: h * 0.25,
        color: '#ff334b',
        level: ch.mortality.modulated,
        pulse: ch.mortality.pulse,
        label: isNarrow
          ? `DEATHS ──► CRUSH ${(synthState.effectiveCrush * 100).toFixed(0)}%`
          : `CH3 CUSTODY MORTALITY ──► BITCRUSH ${(synthState.effectiveCrush * 100).toFixed(0)}% / BELL`
      },
      {
        sx: w * 0.90,
        sy: h * 0.64,
        color: '#34d399',
        level: ch.community.modulated,
        pulse: ch.community.pulse,
        label: isNarrow
          ? `PETITIONS ──► ${Math.round(synthState.effectiveCutoff)}Hz`
          : `CH4 DOCKETS/COMMUNITY ──► CHOIR CUTOFF ${Math.round(synthState.effectiveCutoff)}Hz`
      }
    ];

    ctx.save();
    ctx.font = `${isNarrow ? 9.5 : 10.5}px "IBM Plex Mono", monospace`;

    for (const c of conduits) {
      const alpha = clamp(0.18 + c.level * 0.45 + c.pulse * 0.35, 0.15, 0.95);
      ctx.strokeStyle = c.color;
      ctx.globalAlpha = alpha * 0.55;
      ctx.lineWidth = 1 + c.level * 1.8;

      ctx.beginPath();
      ctx.moveTo(c.sx, c.sy);
      ctx.quadraticCurveTo((c.sx + cx) * 0.5, c.sy, cx, cy);
      ctx.stroke();

      // Traveling telemetry packet dot along Bezier
      const t = (this.time * (0.45 + c.level * 0.85)) % 1;
      const mx = (1 - t) * (1 - t) * c.sx + 2 * (1 - t) * t * ((c.sx + cx) * 0.5) + t * t * cx;
      const my = (1 - t) * (1 - t) * c.sy + 2 * (1 - t) * t * c.sy + t * t * cy;
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(mx, my, 2.5 + c.pulse * 3, 0, Math.PI * 2);
      ctx.fill();

      // Explicit Callout Tag near source anchor
      const alignRight = c.sx > cx;
      const textWidth = ctx.measureText(c.label).width;
      const padX = 7;
      const boxW = textWidth + padX * 2;
      const boxH = 19;
      const bx = alignRight ? clamp(c.sx - boxW, 8, w - boxW - 8) : clamp(c.sx, 8, w - boxW - 8);
      const by = clamp(c.sy - 10, 48, h - 110);

      ctx.globalAlpha = 0.84;
      ctx.fillStyle = 'rgba(9, 12, 18, 0.88)';
      ctx.fillRect(bx, by, boxW, boxH);
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 0.9;
      ctx.strokeRect(bx, by, boxW, boxH);

      ctx.globalAlpha = 0.96;
      ctx.fillStyle = '#eef2f6';
      ctx.fillText(c.label, bx + padX, by + 13);
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
    const scopeY = h * 0.76;
    const scopeAmp = clamp(h * 0.085, 22, 48);

    const outWave = synth.getWaveformData();
    const sanctuaryWave = synth.getSanctuaryWaveData();
    const freqData = synth.getFrequencyData();

    ctx.save();

    // Frequency Spectrum Horizon Bars (subtle)
    if (freqData) {
      const barCount = 72;
      const barW = w / barCount;
      for (let i = 0; i < barCount; i++) {
        const bin = Math.floor(Math.pow(i / barCount, 1.5) * (freqData.length * 0.45));
        const mag = freqData[bin] / 255;
        const bh = mag * scopeAmp * 1.45;
        ctx.fillStyle = `rgba(92, 225, 230, ${0.06 + mag * 0.14})`;
        ctx.fillRect(i * barW, scopeY + scopeAmp * 0.65 - bh, barW - 1.5, bh);
      }
    }

    // 1. Ideal Underlying Sanctuary Wave (Warm Ghosted Gold)
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

    // 2. Actual Master Output Wave (Crushed / Modulated Reality)
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
