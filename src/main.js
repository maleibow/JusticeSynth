/**
 * CELL // SIGNAL — Main Orchestration Controller
 * Connects live carceral telemetry streams to the hybrid Web Audio synthesizer
 * and 60fps stage visualization.
 */

import { TelemetryEngine } from './data/telemetryEngine.js';
import { CarceralSynthEngine, SYNTH_PRESETS } from './audio/synthEngine.js';
import { TelemetryVisualizer } from './render/visualizer.js';

const telemetry = new TelemetryEngine();
const synth = new CarceralSynthEngine();
const canvas = document.getElementById('telemetry-canvas');
const tooltipEl = document.getElementById('memorial-tooltip');
const visualizer = new TelemetryVisualizer(canvas, tooltipEl);

const dom = {
  curtain: document.getElementById('entry-curtain'),
  initBtn: document.getElementById('btn-initialize-engine'),
  audioDot: document.getElementById('audio-status-dot'),
  muteBtn: document.getElementById('btn-mute'),
  muteLabel: document.getElementById('mute-label'),
  apiSyncBtn: document.getElementById('btn-api-sync'),
  fullscreenBtn: document.getElementById('btn-fullscreen'),
  toggleBackendBtn: document.getElementById('btn-toggle-backend'),
  closeBackendBtn: document.getElementById('btn-close-backend'),
  backendDrawer: document.getElementById('synth-backend-drawer'),

  sessionDirect: document.getElementById('session-direct-spend'),
  sessionBurden: document.getElementById('session-total-burden'),
  opportunityReadout: document.getElementById('opportunity-cost-readout'),

  hudSanctuaryBar: document.getElementById('hud-sanctuary-bar'),
  hudSanctuaryVal: document.getElementById('hud-sanctuary-val'),
  hudPressureBar: document.getElementById('hud-pressure-bar'),
  hudPressureVal: document.getElementById('hud-pressure-val'),
  hudMemorialCount: document.getElementById('hud-memorial-count'),

  eventBanner: document.getElementById('event-banner'),
  eventBadge: document.getElementById('event-badge'),
  eventHeadline: document.getElementById('event-headline'),
  eventMeta: document.getElementById('event-meta'),
  eventPatch: document.getElementById('event-patch'),

  cxwPrice: document.getElementById('cxw-price'),
  cxwChg: document.getElementById('cxw-chg'),
  geoPrice: document.getElementById('geo-price'),
  geoChg: document.getElementById('geo-chg'),
  ch1Meta: document.getElementById('ch1-meta'),
  ch2Contract: document.getElementById('ch2-contract-readout'),
  ch2Meta: document.getElementById('ch2-meta'),
  ch3Death: document.getElementById('ch3-death-readout'),
  ch3Meta: document.getElementById('ch3-meta'),
  ch4Community: document.getElementById('ch4-community-readout'),
  ch4Meta: document.getElementById('ch4-meta'),

  xyPad: document.getElementById('struggle-xy-pad'),
  xyPuck: document.getElementById('xy-puck'),
  xyHalo: document.getElementById('xy-resistance-halo'),
  latchBtn: document.getElementById('btn-latch-sanctuary'),
  sanctuarySlider: document.getElementById('sanctuary-push-slider'),
  sanctuaryVal: document.getElementById('sanctuary-push-val'),

  presetSelect: document.getElementById('preset-select'),
  workletChip: document.getElementById('worklet-status-chip'),
  finnhubInput: document.getElementById('finnhub-key-input'),
  saveFinnhubBtn: document.getElementById('btn-save-finnhub')
};

let running = false;
let lastFrameTime = performance.now();
let sanctuaryLatched = false;
let xyDragging = false;
let lastSnapshot = telemetry.getSnapshot();

// ==================== TELEMETRY EVENT SUBSCRIPTIONS ====================
telemetry.onEvent((type, payload) => {
  if (type === 'status') {
    for (const [apiKey, info] of Object.entries(payload)) {
      const pill = document.querySelector(`.api-pill[data-api="${apiKey}"]`);
      const textEl = document.getElementById(`status-${apiKey}`);
      if (pill && textEl) {
        pill.classList.remove('live', 'archive', 'syncing');
        pill.classList.add(info.state);
        textEl.textContent = info.label;
      }
    }
  } else if (type === 'stocks') {
    updateStockReadout(payload);
  } else if (type === 'contract') {
    dom.ch2Contract.textContent = `${payload.recipient} · ${telemetry.formatCurrency(payload.amount)}`;
    dom.ch2Meta.textContent = `${payload.agency} · ${payload.location}`;
    visualizer.triggerContractPulse();
    synth.triggerContractPulse(telemetry.getModulated('spending'));
  } else if (type === 'death') {
    const ageStr = payload.age ? `Age ${payload.age}` : 'Age N/A';
    dom.ch3Death.textContent = `${payload.facility} · ${ageStr} · ${payload.trial_status}`;
    dom.ch3Meta.textContent = `${payload.days_incarcerated}d held · ${payload.cause_of_death}`;
    dom.hudMemorialCount.textContent = `${telemetry.loggedDeathsCount} ${telemetry.loggedDeathsCount === 1 ? 'LIFE' : 'LIVES'} LOGGED`;
    visualizer.triggerDeathShock(payload);
    synth.triggerDeathRupture(payload, telemetry.channels.mortality.aggression);
  } else if (type === 'deathsReady') {
    const ageStr = payload.age ? `Age ${payload.age}` : 'Age N/A';
    dom.ch3Death.textContent = `${payload.facility} · ${ageStr} (${payload.source})`;
    dom.ch3Meta.textContent = `${payload.days_incarcerated}d held · Ready to pulse or auto-stream`;
  } else if (type === 'community') {
    dom.ch4Community.textContent = payload.title;
    dom.ch4Meta.textContent = `${payload.court} · ${payload.impactMetric}`;
  } else if (type === 'event') {
    renderEventBanner(payload);
  }
});

function updateStockReadout(stocks) {
  dom.cxwPrice.textContent = `$${stocks.cxw.price.toFixed(2)}`;
  const cxwSign = stocks.cxw.changePct >= 0 ? '+' : '';
  dom.cxwChg.textContent = `${cxwSign}${stocks.cxw.changePct.toFixed(2)}%`;
  dom.cxwChg.className = `t-chg ${stocks.cxw.changePct >= 0 ? 'up' : 'down'}`;

  dom.geoPrice.textContent = `$${stocks.geo.price.toFixed(2)}`;
  const geoSign = stocks.geo.changePct >= 0 ? '+' : '';
  dom.geoChg.textContent = `${geoSign}${stocks.geo.changePct.toFixed(2)}%`;
  dom.geoChg.className = `t-chg ${stocks.geo.changePct >= 0 ? 'up' : 'down'}`;

  dom.ch1Meta.textContent = stocks.marketOpen
    ? `NYSE OPEN · Vol ${(stocks.cxw.volume / 1e6).toFixed(2)}M / ${(stocks.geo.volume / 1e6).toFixed(2)}M`
    : `NYSE AFTER-HOURS · Anchored Tape Vol ${(stocks.cxw.volume / 1e6).toFixed(2)}M`;
}

function renderEventBanner(ev) {
  dom.eventBanner.classList.remove('death-alert', 'contract-alert', 'equity-alert', 'community-alert');
  if (ev.type === 'death') dom.eventBanner.classList.add('death-alert');
  else if (ev.type === 'contract') dom.eventBanner.classList.add('contract-alert');
  else if (ev.type === 'equity') dom.eventBanner.classList.add('equity-alert');
  else if (ev.type === 'community') dom.eventBanner.classList.add('community-alert');

  dom.eventBadge.textContent = ev.badge;
  dom.eventHeadline.textContent = ev.headline;
  dom.eventMeta.textContent = ev.meta;
  dom.eventPatch.textContent = ev.patch;
}

// ==================== INITIALIZATION & AUDIO UNLOCK ====================
async function initializeEngine() {
  dom.initBtn.disabled = true;
  dom.initBtn.textContent = 'INITIALIZING SYNTH & STREAMING APIS…';

  try {
    await synth.init();
    updateMuteUi();
    dom.workletChip.textContent = `DSP: ${synth.workletStatus}`;
  } catch (err) {
    console.error('[CELL // SIGNAL] Audio init error:', err);
  }

  dom.curtain.classList.add('hidden');
  running = true;

  // Start fetching live telemetry APIs without blocking the animation loop
  telemetry.start().catch(err => console.warn('[Telemetry] Initial sync warning:', err));
}

dom.initBtn.addEventListener('click', initializeEngine);

function updateMuteUi() {
  const isMuted = synth.muted || !synth.initialized;
  dom.muteLabel.textContent = isMuted ? 'AUDIO MUTED' : 'AUDIO LIVE';
  dom.muteBtn.classList.toggle('live', !isMuted);
  dom.audioDot.classList.toggle('active', !isMuted);
  dom.audioDot.classList.toggle('muted', isMuted);
}

dom.muteBtn.addEventListener('click', async () => {
  if (!synth.initialized) {
    await synth.init();
  } else {
    synth.setMuted(!synth.muted);
  }
  updateMuteUi();
});

// ==================== MIXER & CADENCE CONTROLS ====================
document.querySelectorAll('.cadence-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cadence-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    telemetry.setCadence(Number(btn.dataset.cadence));
  });
});

dom.apiSyncBtn.addEventListener('click', () => {
  telemetry.syncAllApis();
});

['equity', 'spending', 'mortality', 'community'].forEach(chName => {
  const slider = document.getElementById(`agg-${chName}`);
  const valLabel = document.getElementById(`agg-val-${chName}`);
  const modeSelect = document.getElementById(`mode-${chName}`);

  slider.addEventListener('input', () => {
    const val = Number(slider.value);
    valLabel.textContent = `${val}%`;
    telemetry.setChannelAggression(chName, val);
  });

  modeSelect.addEventListener('change', () => {
    telemetry.setChannelMode(chName, modeSelect.value);
  });
});

document.getElementById('btn-pulse-equity').addEventListener('click', () => telemetry.pulseEquityShock());
document.getElementById('btn-pulse-contract').addEventListener('click', () => telemetry.pulseContract(true));
document.getElementById('btn-pulse-death').addEventListener('click', () => telemetry.pulseDeathRecord(true));
document.getElementById('btn-pulse-community').addEventListener('click', () => telemetry.pulseCommunity(true));

// ==================== HUMAN SANCTUARY XY PAD & STRUGGLE FORCE ====================
function setSanctuaryXY(nx, ny, syncSlider = true) {
  const x = Math.max(0, Math.min(1, nx));
  const y = Math.max(0, Math.min(1, ny));
  synth.params.xyX = x;
  synth.params.xyY = y;

  dom.xyPuck.style.left = `${(x * 100).toFixed(1)}%`;
  dom.xyPuck.style.top = `${((1 - y) * 100).toFixed(1)}%`;

  if (syncSlider) {
    const pct = Math.round(y * 100);
    dom.sanctuarySlider.value = pct;
    dom.sanctuaryVal.textContent = `${pct}%`;
  }
}

function handlePadPointer(e) {
  const rect = dom.xyPad.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const nx = (e.clientX - rect.left) / rect.width;
  const ny = 1 - (e.clientY - rect.top) / rect.height;
  setSanctuaryXY(nx, ny, true);
}

dom.xyPad.addEventListener('pointerdown', (e) => {
  xyDragging = true;
  dom.xyPad.setPointerCapture(e.pointerId);
  handlePadPointer(e);
});

dom.xyPad.addEventListener('pointermove', (e) => {
  if (!xyDragging) return;
  handlePadPointer(e);
});

const stopPadDrag = () => { xyDragging = false; };
dom.xyPad.addEventListener('pointerup', stopPadDrag);
dom.xyPad.addEventListener('pointercancel', stopPadDrag);

dom.sanctuarySlider.addEventListener('input', () => {
  const val = Number(dom.sanctuarySlider.value) / 100;
  setSanctuaryXY(synth.params.xyX, val, false);
  dom.sanctuaryVal.textContent = `${Math.round(val * 100)}%`;
});

function toggleSanctuaryLatch(forceState) {
  sanctuaryLatched = typeof forceState === 'boolean' ? forceState : !sanctuaryLatched;
  dom.latchBtn.textContent = sanctuaryLatched ? 'LATCH ON' : 'LATCH OFF';
  dom.latchBtn.classList.toggle('active', sanctuaryLatched);
}

dom.latchBtn.addEventListener('click', () => toggleSanctuaryLatch());

// ==================== COLLAPSIBLE BACKEND SYNTH DRAWER ====================
function toggleBackendDrawer(forceOpen) {
  const isCollapsed = dom.backendDrawer.classList.contains('collapsed');
  const open = typeof forceOpen === 'boolean' ? forceOpen : isCollapsed;
  dom.backendDrawer.classList.toggle('collapsed', !open);
  dom.backendDrawer.setAttribute('aria-hidden', String(!open));
  dom.toggleBackendBtn.classList.toggle('open', open);
  dom.toggleBackendBtn.setAttribute('aria-expanded', String(open));
}

dom.toggleBackendBtn.addEventListener('click', () => toggleBackendDrawer());
dom.closeBackendBtn.addEventListener('click', () => toggleBackendDrawer(false));

const PARAM_BINDINGS = [
  { id: 'param-morph', valId: 'val-morph', key: 'morph', fmt: v => `${v}%` },
  { id: 'param-detune', valId: 'val-detune', key: 'detune', fmt: v => `${v} ct` },
  { id: 'param-cutoff', valId: 'val-cutoff', key: 'cutoff', fmt: v => `${v} Hz` },
  { id: 'param-sub', valId: 'val-sub', key: 'sub', fmt: v => `${v}%` },
  { id: 'param-fmDepth', valId: 'val-fmDepth', key: 'fmDepth', fmt: v => `${v}%` },
  { id: 'param-fmRatio1', valId: 'val-fmRatio1', key: 'fmRatio1', fmt: v => `${(v / 100).toFixed(2)}` },
  { id: 'param-fmRatio2', valId: 'val-fmRatio2', key: 'fmRatio2', fmt: v => `${(v / 100).toFixed(2)}` },
  { id: 'param-fmRatio3', valId: 'val-fmRatio3', key: 'fmRatio3', fmt: v => `${(v / 100).toFixed(2)}` },
  { id: 'param-fmFeedback', valId: 'val-fmFeedback', key: 'fmFeedback', fmt: v => `${v}%` },
  { id: 'param-noiseSub', valId: 'val-noiseSub', key: 'noiseSub', fmt: v => `${v}%` },
  { id: 'param-noiseMid', valId: 'val-noiseMid', key: 'noiseMid', fmt: v => `${v}%` },
  { id: 'param-noiseHigh', valId: 'val-noiseHigh', key: 'noiseHigh', fmt: v => `${v}%` },
  { id: 'param-fold', valId: 'val-fold', key: 'fold', fmt: v => `${v}%` },
  { id: 'param-crush', valId: 'val-crush', key: 'crush', fmt: v => `${v}%` },
  { id: 'param-comb', valId: 'val-comb', key: 'comb', fmt: v => `${v}%` },
  { id: 'param-reverb', valId: 'val-reverb', key: 'reverb', fmt: v => `${v}%` },
  { id: 'param-delay', valId: 'val-delay', key: 'delay', fmt: v => `${v}%` },
  { id: 'param-masterVol', valId: 'val-masterVol', key: 'masterVol', fmt: v => `${v}%` }
];

const scaleSelect = document.getElementById('param-scale');
scaleSelect.addEventListener('change', () => {
  synth.setParamValue('scale', scaleSelect.value);
});

PARAM_BINDINGS.forEach(({ id, valId, key, fmt }) => {
  const input = document.getElementById(id);
  const label = document.getElementById(valId);
  if (!input || !label) return;
  input.addEventListener('input', () => {
    const num = Number(input.value);
    label.textContent = fmt(num);
    synth.setParamValue(key, num);
  });
});

function syncBackendUiFromParams() {
  scaleSelect.value = synth.params.scale;
  PARAM_BINDINGS.forEach(({ id, valId, key, fmt }) => {
    const input = document.getElementById(id);
    const label = document.getElementById(valId);
    if (input && label && synth.params[key] !== undefined) {
      input.value = synth.params[key];
      label.textContent = fmt(synth.params[key]);
    }
  });
}

dom.presetSelect.addEventListener('change', () => {
  const presetKey = dom.presetSelect.value;
  if (SYNTH_PRESETS[presetKey]) {
    synth.applyPreset(presetKey);
    syncBackendUiFromParams();
  }
});

// Finnhub Optional API Key
dom.finnhubInput.value = telemetry.finnhubKey || '';
dom.saveFinnhubBtn.addEventListener('click', () => {
  telemetry.saveFinnhubKey(dom.finnhubInput.value);
  telemetry.fetchStocks();
});

// Fullscreen Stage Mode
dom.fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
});

// ==================== KEYBOARD SHORTCUTS ====================
window.addEventListener('keydown', (e) => {
  if (e.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

  const k = e.key.toLowerCase();
  if (e.code === 'Space' || k === 'm') {
    e.preventDefault();
    dom.muteBtn.click();
  } else if (k === 'd') {
    telemetry.pulseDeathRecord(true);
  } else if (k === 'c') {
    telemetry.pulseContract(true);
  } else if (k === 'b') {
    toggleBackendDrawer();
  } else if (k === 's') {
    toggleSanctuaryLatch();
  } else if (k === 'f') {
    dom.fullscreenBtn.click();
  }
});

// ==================== RESPONSIVE CANVAS & 60FPS MAIN LOOP ====================
const resizeObserver = new ResizeObserver(() => visualizer.resize());
resizeObserver.observe(canvas);
window.addEventListener('resize', () => visualizer.resize());

function updateDomTelemetry(snapshot) {
  // Macro counters
  dom.sessionDirect.textContent = `$${snapshot.macro.directSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  dom.sessionBurden.textContent = `$${snapshot.macro.totalBurden.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  dom.opportunityReadout.textContent = `${snapshot.macro.teacherYears.toFixed(2)} TEACHER YRS · ${snapshot.macro.housingUnits.toFixed(2)} HOUSING UNITS`;

  // Struggle HUD
  const sancPct = Math.round(synth.state.sanctuaryStrength * 100);
  const presPct = Math.round(Math.min(100, (synth.state.systemicPressure / 1.2) * 100));
  dom.hudSanctuaryBar.style.width = `${sancPct}%`;
  dom.hudSanctuaryVal.textContent = `${sancPct}%`;
  dom.hudPressureBar.style.width = `${presPct}%`;
  dom.hudPressureVal.textContent = `${presPct}%`;

  // Resistance halo around XY puck visualizes pressure pushing against user
  const haloSize = 26 + synth.state.systemicPressure * 54;
  dom.xyHalo.style.left = dom.xyPuck.style.left;
  dom.xyHalo.style.top = dom.xyPuck.style.top;
  dom.xyHalo.style.width = `${haloSize.toFixed(0)}px`;
  dom.xyHalo.style.height = `${haloSize.toFixed(0)}px`;

  // LFO Mixer Bars + Live Explicit Patch Callouts
  for (const chName of ['equity', 'spending', 'mortality', 'community']) {
    const mod = snapshot.channels[chName].modulated;
    const pct = Math.min(100, Math.round((mod / 1.5) * 100));
    document.getElementById(`lfo-bar-${chName}`).style.width = `${pct}%`;
    document.getElementById(`lfo-pct-${chName}`).textContent = `${Math.round(mod * 100)}%`;
  }

  document.getElementById('route-equity').textContent =
    `──► FM ${(synth.state.effectiveFmIndex * 100).toFixed(0)}% · CELL COMB ${(synth.state.effectiveComb * 100).toFixed(0)}%`;
  document.getElementById('route-spending').textContent =
    `──► WAVEFOLD ${(synth.state.effectiveFold * 100).toFixed(0)}% · SUB PRESSURE`;
  document.getElementById('route-mortality').textContent =
    `──► BITCRUSH ${(synth.state.effectiveCrush * 100).toFixed(0)}% · MEMORIAL BELL`;
  document.getElementById('route-community').textContent =
    `──► CHOIR FILTER ${Math.round(synth.state.effectiveCutoff)}Hz · BLOOM`;
}

function frame(now) {
  const dt = Math.max(0.001, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  if (running) {
    lastSnapshot = telemetry.update(dt);

    // Subtle systemic gravity pulls sanctuary down gently if not dragged or latched
    if (!xyDragging && !sanctuaryLatched) {
      const pullForce = lastSnapshot.systemicPressure * 0.032 * dt;
      if (synth.params.xyY > 0.16) {
        setSanctuaryXY(synth.params.xyX, synth.params.xyY - pullForce, true);
      }
    }

    synth.update(lastSnapshot, dt);
    updateDomTelemetry(lastSnapshot);
  }

  visualizer.render(dt, lastSnapshot, synth);
  requestAnimationFrame(frame);
}

setSanctuaryXY(0.35, 0.55, true);
syncBackendUiFromParams();
requestAnimationFrame(frame);
