/**
 * JUSTICE SYNTH — Main Orchestration Controller
 * Connects live U.S. carceral data streams, interactive bare-bones data inspector,
 * full musical key/mode transposition, and hybrid Web Audio synthesizer.
 */

import { TelemetryEngine } from './data/telemetryEngine.js';
import { CarceralSynthEngine, SYNTH_PRESETS } from './audio/synthEngine.js';
import { TelemetryVisualizer } from './render/visualizer.js';

const telemetry = new TelemetryEngine();
const synth = new CarceralSynthEngine();
const canvas = document.getElementById('telemetry-canvas');
const tooltipEl = document.getElementById('memorial-tooltip');

let activeInspectorSection = null;
let lastStageSection = 'spending';

const visualizer = new TelemetryVisualizer(
  canvas,
  tooltipEl,
  (nodeKey) => openInspector(nodeKey),
  (nx, ny) => setSanctuaryXY(nx, ny, true)
);

const dom = {
  app: document.getElementById('app'),
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

  selectKey: document.getElementById('select-key'),
  selectMode: document.getElementById('select-mode'),
  backendSelectKey: document.getElementById('backend-select-key'),
  backendSelectMode: document.getElementById('backend-select-mode'),
  paramA4: document.getElementById('param-a4'),

  sessionDirect: document.getElementById('session-direct-spend'),
  hudMemorialCount: document.getElementById('hud-memorial-count'),

  clockSpendVal: document.getElementById('clock-spend-val'),
  clockSpendSub: document.getElementById('clock-spend-sub'),
  clockEquityVal: document.getElementById('clock-equity-val'),
  clockEquitySub: document.getElementById('clock-equity-sub'),
  clockCustodyVal: document.getElementById('clock-custody-val'),
  clockCustodySub: document.getElementById('clock-custody-sub'),
  clockDeathsVal: document.getElementById('clock-deaths-val'),
  clockDeathsSub: document.getElementById('clock-deaths-sub'),
  clockCommunityVal: document.getElementById('clock-community-val'),
  clockCommunitySub: document.getElementById('clock-community-sub'),
  btnStageShock: document.getElementById('btn-stage-shock'),

  stagePill: document.getElementById('stage-active-pill'),
  stagePillBadge: document.getElementById('stage-pill-badge'),
  stagePillText: document.getElementById('stage-pill-text'),

  inspector: document.getElementById('data-inspector'),
  inspectorTitle: document.getElementById('inspector-title'),
  inspectorStatus: document.getElementById('inspector-status'),
  inspectorSource: document.getElementById('inspector-source'),
  inspectorMeaning: document.getElementById('inspector-meaning'),
  inspectorCadence: document.getElementById('inspector-cadence'),
  inspectorUpdated: document.getElementById('inspector-updated'),
  inspectorWeightBox: document.getElementById('inspector-weight-box'),
  inspectorAggSlider: document.getElementById('inspector-agg-slider'),
  inspectorAggVal: document.getElementById('inspector-agg-val'),
  inspectorRecords: document.getElementById('inspector-records'),
  inspectorNextBtn: document.getElementById('btn-inspector-next'),
  closeInspectorBtn: document.getElementById('btn-close-inspector'),

  cxwPrice: document.getElementById('cxw-price'),
  cxwChg: document.getElementById('cxw-chg'),
  geoPrice: document.getElementById('geo-price'),
  geoChg: document.getElementById('geo-chg'),
  ch2Primary: document.getElementById('ch2-primary'),
  ch3Primary: document.getElementById('ch3-primary'),
  ch4Primary: document.getElementById('ch4-primary'),
  ch5Primary: document.getElementById('ch5-primary'),

  ch1Updated: document.getElementById('ch1-updated'),
  ch2Updated: document.getElementById('ch2-updated'),
  ch3Updated: document.getElementById('ch3-updated'),
  ch4Updated: document.getElementById('ch4-updated'),
  ch5Updated: document.getElementById('ch5-updated'),

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
let lastUpdatedTextTick = 0;

function formatElapsedAgo(ms) {
  const sec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

function formatClock(ms) {
  try {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (_) {
    return 'Just now';
  }
}

// ==================== BARE-BONES INTERACTIVE DATA INSPECTOR ====================
function openInspector(sectionKey, toggleIfSame = false) {
  if (toggleIfSame && activeInspectorSection === sectionKey) {
    closeInspector();
    return;
  }

  activeInspectorSection = sectionKey;
  visualizer.setSelectedSection(sectionKey);

  document.querySelectorAll('.lfo-channel').forEach(el => {
    el.classList.toggle('selected', el.dataset.section === sectionKey);
  });
  document.querySelectorAll('.clickable-section').forEach(el => {
    el.classList.toggle('selected', el.dataset.inspect === sectionKey);
  });

  renderInspectorContent();
  dom.inspector.classList.remove('hidden');
}

function closeInspector() {
  activeInspectorSection = null;
  visualizer.setSelectedSection(null);
  dom.inspector.classList.add('hidden');
  document.querySelectorAll('.lfo-channel, .clickable-section').forEach(el => {
    el.classList.remove('selected');
  });
}

function renderInspectorContent() {
  if (!activeInspectorSection) return;
  const info = telemetry.getSectionDetails(activeInspectorSection);

  dom.inspectorTitle.textContent = info.title;
  dom.inspectorStatus.textContent = info.statusLabel;
  dom.inspectorStatus.classList.toggle('archive', info.statusState !== 'live');
  dom.inspectorSource.textContent = info.source;
  dom.inspectorMeaning.textContent = info.indicates;
  dom.inspectorCadence.textContent = info.frequency;
  dom.inspectorUpdated.textContent = `${formatClock(info.lastUpdatedMs)} (${formatElapsedAgo(info.lastUpdatedMs)})`;
  dom.inspectorNextBtn.textContent = info.actionLabel;

  const chState = telemetry.channels[activeInspectorSection];
  if (chState && dom.inspectorWeightBox) {
    const pct = Math.round(chState.aggression * 100);
    dom.inspectorWeightBox.classList.remove('hidden');
    dom.inspectorAggSlider.value = pct;
    dom.inspectorAggVal.textContent = `${pct}%`;
  } else if (dom.inspectorWeightBox) {
    dom.inspectorWeightBox.classList.add('hidden');
  }

  dom.inspectorRecords.innerHTML = '';
  for (const rec of info.records) {
    const item = document.createElement('div');
    item.className = 'inspector-record-item';
    const lbl = document.createElement('div');
    lbl.className = 'inspector-record-label';
    lbl.textContent = rec.label;
    const det = document.createElement('div');
    det.className = 'inspector-record-detail';
    det.textContent = rec.detail;
    item.appendChild(lbl);
    item.appendChild(det);
    dom.inspectorRecords.appendChild(item);
  }
}

dom.closeInspectorBtn.addEventListener('click', closeInspector);

if (dom.inspectorAggSlider) {
  dom.inspectorAggSlider.addEventListener('input', () => {
    if (!activeInspectorSection || !telemetry.channels[activeInspectorSection]) return;
    const val = Number(dom.inspectorAggSlider.value);
    dom.inspectorAggVal.textContent = `${val}%`;
    telemetry.setChannelAggression(activeInspectorSection, val);

    const cardSlider = document.getElementById(`agg-${activeInspectorSection}`);
    const cardVal = document.getElementById(`agg-val-${activeInspectorSection}`);
    if (cardSlider) cardSlider.value = val;
    if (cardVal) cardVal.textContent = `${val}%`;
  });
}

const VALID_VIEWS = ['clock', 'console', 'pure'];
let currentViewMode = 'clock';

function setViewMode(mode) {
  if (!VALID_VIEWS.includes(mode)) return;
  currentViewMode = mode;
  dom.app.dataset.view = mode;
  document.querySelectorAll('[data-view-mode]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.viewMode === mode);
  });
  visualizer.setViewMode(mode);
  if (mode === 'pure' && activeInspectorSection) {
    closeInspector();
  }
  requestAnimationFrame(() => visualizer.resize());
}

document.querySelectorAll('[data-view-mode]').forEach(btn => {
  btn.addEventListener('click', () => setViewMode(btn.dataset.viewMode));
});

if (dom.btnStageShock) {
  dom.btnStageShock.addEventListener('click', () => telemetry.pulseDeathRecord(true));
}

dom.inspectorNextBtn.addEventListener('click', () => {
  if (activeInspectorSection === 'equity') telemetry.pulseEquityShock();
  else if (activeInspectorSection === 'spending') telemetry.pulseContract(true);
  else if (activeInspectorSection === 'mortality') telemetry.pulseDeathRecord(true);
  else if (activeInspectorSection === 'community') telemetry.pulseCommunity(true);
  else if (activeInspectorSection === 'nycdoc') telemetry.pulseNycInmate(true);
  else telemetry.syncAllApis();
  renderInspectorContent();
});

document.querySelectorAll('[data-inspect]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    openInspector(el.dataset.inspect, true);
  });
});

document.querySelectorAll('.lfo-channel[data-section]').forEach(card => {
  card.addEventListener('click', (e) => {
    if (e.target.closest('input, button, select, label')) return;
    openInspector(card.dataset.section, true);
  });
});

dom.stagePill.addEventListener('click', () => {
  openInspector(lastStageSection, false);
});

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
    if (activeInspectorSection) renderInspectorContent();
  } else if (type === 'stocks') {
    updateStockReadout(payload);
    if (activeInspectorSection === 'equity') renderInspectorContent();
  } else if (type === 'contract') {
    dom.ch2Primary.textContent = `${telemetry.formatCurrency(payload.amount)} · ${payload.recipient}`;
    visualizer.triggerContractPulse();
    synth.triggerContractPulse(telemetry.getModulated('spending'));
    if (activeInspectorSection === 'spending') renderInspectorContent();
  } else if (type === 'death') {
    const ageStr = payload.age ? `Age ${payload.age}` : 'Age N/A';
    dom.ch3Primary.textContent = `${payload.facility} · ${ageStr}`;
    dom.hudMemorialCount.textContent = String(telemetry.loggedDeathsCount);
    if (dom.clockDeathsVal) dom.clockDeathsVal.textContent = String(telemetry.loggedDeathsCount);
    if (dom.clockDeathsSub) dom.clockDeathsSub.textContent = `${payload.facility} · ${ageStr}`;
    const mortClock = document.querySelector('.ch-mortality-glow');
    if (mortClock) {
      mortClock.classList.add('shock-pulse');
      clearTimeout(mortClock._shockTimer);
      mortClock._shockTimer = setTimeout(() => mortClock.classList.remove('shock-pulse'), 750);
    }
    visualizer.triggerDeathShock(payload);
    synth.triggerDeathRupture(payload, telemetry.channels.mortality.aggression);
    if (activeInspectorSection === 'mortality') renderInspectorContent();
  } else if (type === 'deathsReady') {
    const ageStr = payload.age ? `Age ${payload.age}` : 'Age N/A';
    dom.ch3Primary.textContent = `${payload.facility} · ${ageStr}`;
    if (dom.clockDeathsSub) dom.clockDeathsSub.textContent = `${payload.facility} · ${ageStr}`;
  } else if (type === 'community') {
    dom.ch4Primary.textContent = payload.title;
    if (dom.clockCommunitySub) dom.clockCommunitySub.textContent = payload.title;
    if (activeInspectorSection === 'community') renderInspectorContent();
  } else if (type === 'nycdoc') {
    const stats = payload.stats || telemetry.nycStats;
    const pct = stats.total > 0 ? Math.round((stats.pretrial / stats.total) * 100) : 86;
    dom.ch5Primary.textContent = `${stats.total.toLocaleString('en-US')} held · ${pct}% pre-trial`;
    if (dom.clockCustodyVal) dom.clockCustodyVal.textContent = `${stats.total.toLocaleString('en-US')} · 1,918,500`;
    if (dom.clockCustodySub) dom.clockCustodySub.textContent = `${pct}% pre-trial in NYC · ${stats.bradh.toLocaleString('en-US')} Brad H.`;
    const nycFlow = document.querySelector('.ch-nycdoc-glow .clock-flow');
    if (nycFlow) nycFlow.textContent = `↓ ${pct}% UNCONVICTED PRE-TRIAL (NYC DOC)`;
    if (payload.emitAudio && payload.record) {
      visualizer.triggerNycPulse();
      synth.triggerNycInmatePulse(payload.record, telemetry.channels.nycdoc.aggression);
    }
    if (activeInspectorSection === 'nycdoc') renderInspectorContent();
  } else if (type === 'event') {
    lastStageSection = payload.section || 'spending';
    dom.stagePill.classList.toggle('death-alert', payload.type === 'death');
    dom.stagePillBadge.textContent = payload.badge;
    dom.stagePillText.textContent = payload.headline;
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

  if (dom.clockEquityVal) {
    dom.clockEquityVal.textContent = `$${stocks.cxw.price.toFixed(2)} / $${stocks.geo.price.toFixed(2)}`;
  }
  if (dom.clockEquitySub) {
    dom.clockEquitySub.textContent = `CXW ${cxwSign}${stocks.cxw.changePct.toFixed(2)}% · GEO ${geoSign}${stocks.geo.changePct.toFixed(2)}%`;
  }
}

// ==================== INITIALIZATION & AUDIO UNLOCK ====================
async function initializeEngine() {
  dom.initBtn.disabled = true;
  dom.initBtn.textContent = 'STARTING…';

  try {
    await synth.init();
    updateMuteUi();
    dom.workletChip.textContent = `DSP: ${synth.workletStatus}`;
  } catch (err) {
    console.error('[JUSTICE SYNTH] Audio init error:', err);
  }

  dom.curtain.classList.add('hidden');
  running = true;
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

// ==================== LIVE SET KEY, MODE & TUNING SYNC ====================
function applyKeyAndMode(rootKey, modeKey, a4Freq = synth.params.a4Freq) {
  synth.setMusicalKeyAndMode(rootKey, modeKey, a4Freq);
  dom.selectKey.value = synth.params.rootKey;
  dom.backendSelectKey.value = synth.params.rootKey;
  dom.selectMode.value = synth.params.modeKey;
  dom.backendSelectMode.value = synth.params.modeKey;
  dom.paramA4.value = String(synth.params.a4Freq);
}

dom.selectKey.addEventListener('change', () => applyKeyAndMode(dom.selectKey.value, synth.params.modeKey));
dom.selectMode.addEventListener('change', () => applyKeyAndMode(synth.params.rootKey, dom.selectMode.value));
dom.backendSelectKey.addEventListener('change', () => applyKeyAndMode(dom.backendSelectKey.value, synth.params.modeKey));
dom.backendSelectMode.addEventListener('change', () => applyKeyAndMode(synth.params.rootKey, dom.backendSelectMode.value));
dom.paramA4.addEventListener('change', () => applyKeyAndMode(synth.params.rootKey, synth.params.modeKey, Number(dom.paramA4.value)));

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

['equity', 'spending', 'mortality', 'community', 'nycdoc'].forEach(chName => {
  const slider = document.getElementById(`agg-${chName}`);
  const valLabel = document.getElementById(`agg-val-${chName}`);
  const modeSelect = document.getElementById(`mode-${chName}`);

  slider.addEventListener('input', () => {
    const val = Number(slider.value);
    valLabel.textContent = `${val}%`;
    telemetry.setChannelAggression(chName, val);
  });

  if (modeSelect) {
    modeSelect.addEventListener('change', () => {
      telemetry.setChannelMode(chName, modeSelect.value);
    });
  }
});

document.getElementById('btn-pulse-equity').addEventListener('click', () => telemetry.pulseEquityShock());
document.getElementById('btn-pulse-contract').addEventListener('click', () => telemetry.pulseContract(true));
document.getElementById('btn-pulse-death').addEventListener('click', () => telemetry.pulseDeathRecord(true));
document.getElementById('btn-pulse-community').addEventListener('click', () => telemetry.pulseCommunity(true));
document.getElementById('btn-pulse-nycdoc').addEventListener('click', () => telemetry.pulseNycInmate(true));

// ==================== HUMAN vs SYSTEM XY PAD ====================
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

// ==================== SYNTH BACKEND DRAWER ====================
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
  applyKeyAndMode(synth.params.rootKey, synth.params.modeKey, synth.params.a4Freq);
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

dom.finnhubInput.value = telemetry.finnhubKey || '';
dom.saveFinnhubBtn.addEventListener('click', () => {
  telemetry.saveFinnhubKey(dom.finnhubInput.value);
  telemetry.fetchStocks();
});

dom.fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
});

window.addEventListener('keydown', (e) => {
  if (e.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

  const k = e.key.toLowerCase();
  if (e.code === 'Space' || k === 'm') {
    e.preventDefault();
    dom.muteBtn.click();
  } else if (k === '1') {
    setViewMode('clock');
  } else if (k === '2') {
    setViewMode('console');
  } else if (k === '3') {
    setViewMode('pure');
  } else if (k === 'v') {
    setViewMode(VALID_VIEWS[(VALID_VIEWS.indexOf(currentViewMode) + 1) % VALID_VIEWS.length]);
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
  } else if (k === 'escape' && activeInspectorSection) {
    closeInspector();
  }
});

// ==================== CANVAS RESIZE & 60FPS LOOP ====================
const resizeObserver = new ResizeObserver(() => visualizer.resize());
resizeObserver.observe(canvas);
window.addEventListener('resize', () => visualizer.resize());

function updateDomTelemetry(snapshot, nowMs) {
  const spendFormatted = `$${snapshot.macro.directSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  dom.sessionDirect.textContent = spendFormatted;
  if (dom.clockSpendVal) dom.clockSpendVal.textContent = spendFormatted;
  if (dom.clockSpendSub) {
    const burdenFormatted = snapshot.macro.totalBurden.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    dom.clockSpendSub.textContent = `Total burden: $${burdenFormatted} ($5,771/sec)`;
  }

  const haloSize = 26 + synth.state.systemicPressure * 54;
  dom.xyHalo.style.left = dom.xyPuck.style.left;
  dom.xyHalo.style.top = dom.xyPuck.style.top;
  dom.xyHalo.style.width = `${haloSize.toFixed(0)}px`;
  dom.xyHalo.style.height = `${haloSize.toFixed(0)}px`;

  for (const chName of ['equity', 'spending', 'mortality', 'community', 'nycdoc']) {
    const mod = snapshot.channels[chName].modulated;
    const pct = Math.min(100, Math.round((mod / 1.5) * 100));
    document.getElementById(`lfo-bar-${chName}`).style.width = `${pct}%`;
    document.getElementById(`lfo-pct-${chName}`).textContent = `${Math.round(mod * 100)}%`;
  }

  // Update "Last updated: Xs ago" readouts cleanly once per second
  if (nowMs - lastUpdatedTextTick >= 900) {
    lastUpdatedTextTick = nowMs;
    dom.ch1Updated.textContent = `Updated ${formatElapsedAgo(telemetry.lastUpdated.equity)} · ${telemetry.stocks.marketOpen ? '25s poll' : 'Tape replay'}`;
    dom.ch2Updated.textContent = `Updated ${formatElapsedAgo(telemetry.lastUpdated.spending)} · USAspending API`;
    dom.ch3Updated.textContent = `Updated ${formatElapsedAgo(telemetry.lastUpdated.mortality)} · UCLA / IT DB`;
    dom.ch4Updated.textContent = `Updated ${formatElapsedAgo(telemetry.lastUpdated.community)} · Daily filings`;
    dom.ch5Updated.textContent = `Updated ${formatElapsedAgo(telemetry.lastUpdated.nycdoc)} · NYC OpenData`;

    if (activeInspectorSection) {
      const info = telemetry.getSectionDetails(activeInspectorSection);
      dom.inspectorUpdated.textContent = `${formatClock(info.lastUpdatedMs)} (${formatElapsedAgo(info.lastUpdatedMs)})`;
    }
  }
}

function frame(now) {
  const dt = Math.max(0.001, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  if (running) {
    lastSnapshot = telemetry.update(dt);

    if (!xyDragging && !sanctuaryLatched) {
      const pullForce = lastSnapshot.systemicPressure * 0.032 * dt;
      if (synth.params.xyY > 0.16) {
        setSanctuaryXY(synth.params.xyX, synth.params.xyY - pullForce, true);
      }
    }

    synth.update(lastSnapshot, dt);
    updateDomTelemetry(lastSnapshot, now);
  }

  visualizer.render(dt, lastSnapshot, synth);
  requestAnimationFrame(frame);
}

setSanctuaryXY(0.35, 0.55, true);
syncBackendUiFromParams();
requestAnimationFrame(frame);
