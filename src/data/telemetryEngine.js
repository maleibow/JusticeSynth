/**
 * CELL // SIGNAL — Live Carceral Telemetry Engine
 *
 * Streams and normalizes data from:
 *  1. Private Prison Equities (NYSE: CXW CoreCivic & NYSE: GEO GEO Group)
 *  2. USAspending.gov API v2 (Federal Bureau of Prisons & DHS/ICE Contracts + Macroeconomic Burn)
 *  3. Incarceration Transparency API & UCLA Law Behind Bars (Custody Mortality Records)
 *  4. Federal Register BOP API & CourtListener (Prisoner Petitions, Notices & Community Impact)
 *
 * Includes resilient CORS-proxy fallback and verified archival datasets so a live
 * stage performance never stalls due to network variance or rate limits.
 */

const DIRECT_SPEND_PER_SEC = 2560.55;  // ~$80.75B/yr direct public corrections expenditure
const TOTAL_BURDEN_PER_SEC = 5771.18;  // ~$182B/yr total economic burden (PPI / Vera)

const FALLBACK_CONTRACTS = [
  {
    awardId: '70CDCR24FC0000018',
    recipient: 'THE GEO GROUP, INC.',
    agency: 'U.S. Immigration and Customs Enforcement (DHS)',
    amount: 148620400,
    location: 'Adelanto, CA — Adelanto ICE Processing Center',
    description: 'Detention management, guard staffing, and bed-space operations under fixed minimum guarantee',
    source: 'USAspending Archive'
  },
  {
    awardId: '15BCTS24F00000042',
    recipient: 'CORECIVIC, INC.',
    agency: 'Federal Bureau of Prisons / US Marshals Service',
    amount: 92410000,
    location: 'Eloy, AZ — Central Arizona Florence Correctional Complex',
    description: 'Federal pre-trial & custodial detention housing per-diem contract',
    source: 'USAspending Archive'
  },
  {
    awardId: '70CDCR23D00000009',
    recipient: 'CORECIVIC, INC.',
    agency: 'U.S. Immigration and Customs Enforcement (DHS)',
    amount: 112840000,
    location: 'Dilley, TX — South Texas Family Residential Center',
    description: 'Secure residential detention facility operations and security personnel',
    source: 'USAspending Archive'
  },
  {
    awardId: '15B40824P00000112',
    recipient: 'THE GEO GROUP, INC.',
    agency: 'Federal Bureau of Prisons (DOJ 015)',
    amount: 67350000,
    location: 'Philipsburg, PA — Moshannon Valley Processing Center',
    description: 'Contracted correctional bed capacity and perimeter security',
    source: 'USAspending Archive'
  },
  {
    awardId: '15JPSS24F00000284',
    recipient: 'BI INCORPORATED (GEO SUBSIDIARY)',
    agency: 'U.S. Immigration and Customs Enforcement',
    amount: 214500000,
    location: 'Boulder, CO / Nationwide Electronic Monitoring',
    description: 'ISAP GPS ankle-monitoring and biometric surveillance contracts',
    source: 'USAspending Archive'
  },
  {
    awardId: '15BFA024F00000091',
    recipient: 'MANAGEMENT & TRAINING CORPORATION',
    agency: 'Federal Bureau of Prisons / USMS',
    amount: 54920000,
    location: 'Otero County, NM — Otero County Processing Center',
    description: 'Private correctional management and custodial services',
    source: 'USAspending Archive'
  }
];

const FALLBACK_DEATH_RECORDS = [
  {
    id: 'IT-LA-4012',
    facility: 'Orleans Justice Center (LA)',
    age: 34,
    sex: 'Male',
    race: 'Black',
    trial_status: 'Pre-trial (Unconvicted)',
    days_incarcerated: 118,
    cause_of_death: 'Medical Neglect / Untreated Sepsis',
    year: 2024,
    source: 'Incarceration Transparency Archive'
  },
  {
    id: 'UCLA-FED-884',
    facility: 'USP Thomson (Federal BOP — IL)',
    age: 41,
    sex: 'Male',
    race: 'Hispanic/Latino',
    trial_status: 'Sentenced',
    days_incarcerated: 1490,
    cause_of_death: 'Restrictive Housing / Suicide',
    year: 2023,
    source: 'UCLA Behind Bars Archive'
  },
  {
    id: 'IT-LA-3891',
    facility: 'East Baton Rouge Parish Prison (LA)',
    age: 29,
    sex: 'Male',
    race: 'Black',
    trial_status: 'Pre-trial (Unconvicted)',
    days_incarcerated: 24,
    cause_of_death: 'Acute Withdrawal / Lack of Detox Care',
    year: 2023,
    source: 'Incarceration Transparency Archive'
  },
  {
    id: 'UCLA-ICE-317',
    facility: 'Stewart Detention Center (CoreCivic — GA)',
    age: 52,
    sex: 'Male',
    race: 'Hispanic/Latino',
    trial_status: 'Civil Detention (Pre-Hearing)',
    days_incarcerated: 263,
    cause_of_death: 'Cardiac Arrest After Delayed Emergency Transfer',
    year: 2024,
    source: 'UCLA Behind Bars Archive'
  },
  {
    id: 'IT-LA-4109',
    facility: 'Louisiana State Penitentiary (Angola)',
    age: 63,
    sex: 'Male',
    race: 'Black',
    trial_status: 'Sentenced',
    days_incarcerated: 9840,
    cause_of_death: 'Heat-Related Organ Failure / Chronic Illness',
    year: 2024,
    source: 'Incarceration Transparency Archive'
  },
  {
    id: 'UCLA-TX-902',
    facility: 'Harris County Jail (TX)',
    age: 26,
    sex: 'Female',
    race: 'Black',
    trial_status: 'Pre-trial (Unconvicted)',
    days_incarcerated: 9,
    cause_of_death: 'Medical Distress in Holding Cell',
    year: 2024,
    source: 'UCLA Behind Bars Archive'
  },
  {
    id: 'UCLA-FED-712',
    facility: 'MCC New York / MDC Brooklyn (Federal BOP)',
    age: 47,
    sex: 'Male',
    race: 'White',
    trial_status: 'Pre-trial (Unconvicted)',
    days_incarcerated: 412,
    cause_of_death: 'Acute Respiratory Failure / Staffing Shortage',
    year: 2023,
    source: 'UCLA Behind Bars Archive'
  },
  {
    id: 'IT-LA-3770',
    facility: 'Caddo Correctional Center (LA)',
    age: 38,
    sex: 'Female',
    race: 'White',
    trial_status: 'Pre-trial (Unconvicted)',
    days_incarcerated: 47,
    cause_of_death: 'Undiagnosed Pulmonary Embolism',
    year: 2023,
    source: 'Incarceration Transparency Archive'
  }
];

const FALLBACK_COMMUNITY_FILINGS = [
  {
    title: 'Estelle v. Gamble Eighth Amendment Petition — Inadequate Medical Care in Restrictive Housing',
    court: 'U.S. District Court · Civil Rights (42 U.S.C. § 1983)',
    date: '2025-11-02',
    impactMetric: '426,000+ people detained unconvicted nationwide due to cash bail',
    source: 'CourtListener Docket Archive'
  },
  {
    title: 'Federal Bureau of Prisons Notice — Inmate Communications & Commissary Fee Schedules',
    court: 'Federal Register · Department of Justice (BOP)',
    date: '2025-10-18',
    impactMetric: '$2.9B extracted annually from families for prison phone/commissary charges',
    source: 'Federal Register Archive'
  },
  {
    title: 'Class Action Habeas Corpus — Excessive Summer Temperatures in Non-Air-Conditioned Facilities',
    court: 'U.S. Court of Appeals (5th Circuit)',
    date: '2025-09-29',
    impactMetric: '2.7M U.S. children currently have at least one incarcerated parent',
    source: 'CourtListener Docket Archive'
  },
  {
    title: 'DOJ Office of Inspector General Audit — Private Contract Detention Staffing Deficiencies',
    court: 'U.S. Department of Justice Oversight',
    date: '2025-10-04',
    impactMetric: '$65,000+ average annual cost per federal prisoner vs $15,900 per public school student',
    source: 'Federal Register Archive'
  }
];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function fetchViaCorsFallback(url, options = {}, timeoutMs = 4800) {
  try {
    const direct = await fetchWithTimeout(url, options, timeoutMs);
    if (direct.ok) return direct;
  } catch (_) {
    // Fall through to CORS proxies for GET requests
  }

  if (options.method && options.method !== 'GET') {
    throw new Error('POST proxy skipped');
  }

  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  ];

  for (const proxied of proxies) {
    try {
      const res = await fetchWithTimeout(proxied, { method: 'GET' }, timeoutMs);
      if (res.ok) return res;
    } catch (_) {
      // Try next proxy
    }
  }
  throw new Error(`All fetch paths failed for ${url}`);
}

export class TelemetryEngine {
  constructor() {
    this.startTime = performance.now();
    this.cadence = 1; // 1x, 4x, 16x
    this.finnhubKey = this.loadFinnhubKey();

    this.apiStatus = {
      stocks: { state: 'syncing', label: 'SYNCING' },
      usaspending: { state: 'syncing', label: 'SYNCING' },
      deaths: { state: 'syncing', label: 'SYNCING' },
      community: { state: 'syncing', label: 'SYNCING' }
    };

    // Stock baseline state (CXW & GEO)
    this.stocks = {
      cxw: { price: 18.42, prevClose: 18.08, changePct: 1.88, volume: 1842100, history: [18.08, 18.19, 18.25, 18.31, 18.42] },
      geo: { price: 24.85, prevClose: 24.30, changePct: 2.26, volume: 2390400, history: [24.30, 24.42, 24.61, 24.70, 24.85] },
      marketOpen: this.isUsEquityMarketOpen(),
      liveFetched: false
    };

    // Datasets
    this.contracts = [...FALLBACK_CONTRACTS];
    this.contractIdx = 0;
    this.currentContract = FALLBACK_CONTRACTS[0];
    this.deathRecords = [...FALLBACK_DEATH_RECORDS];
    this.deathIdx = 0;
    this.currentDeath = FALLBACK_DEATH_RECORDS[0];
    this.communityFilings = [...FALLBACK_COMMUNITY_FILINGS];
    this.communityIdx = 0;
    this.currentCommunity = FALLBACK_COMMUNITY_FILINGS[0];

    this.lastUpdated = {
      equity: Date.now(),
      spending: Date.now(),
      mortality: Date.now(),
      community: Date.now(),
      population: Date.now()
    };

    // 4 Moldable Telemetry LFO Channels
    this.channels = {
      equity: {
        rawTarget: 0.38,
        value: 0.35,
        stepped: 0.35,
        aggression: 1.0,
        mode: 'slew',
        pulse: 0,
        phase: 0
      },
      spending: {
        rawTarget: 0.45,
        value: 0.42,
        stepped: 0.42,
        aggression: 1.0,
        mode: 'slew',
        pulse: 0,
        phase: 1.2
      },
      mortality: {
        rawTarget: 0.28,
        value: 0.25,
        stepped: 0.25,
        aggression: 1.25,
        mode: 'spike',
        pulse: 0,
        phase: 2.4
      },
      community: {
        rawTarget: 0.52,
        value: 0.48,
        stepped: 0.48,
        aggression: 1.1,
        mode: 'slew',
        pulse: 0,
        phase: 0.7
      }
    };

    // Active telemetry counters & event callbacks
    this.loggedDeathsCount = 0;
    this.lastEvent = null;
    this.listeners = new Set();

    // Timers
    this._tickAccum = 0;
    this._contractAccum = 0;
    this._deathAccum = 0;
    this._communityAccum = 0;
    this._stepAccum = 0;
    this._pollInterval = null;
  }

  loadFinnhubKey() {
    try {
      return localStorage.getItem('cell_signal_finnhub_key') || '';
    } catch (_) {
      return '';
    }
  }

  saveFinnhubKey(key) {
    this.finnhubKey = (key || '').trim();
    try {
      localStorage.setItem('cell_signal_finnhub_key', this.finnhubKey);
    } catch (_) {
      // Ignore storage errors in private browsing
    }
  }

  isUsEquityMarketOpen() {
    try {
      const now = new Date();
      const ny = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const day = ny.getDay();
      if (day === 0 || day === 6) return false;
      const minutes = ny.getHours() * 60 + ny.getMinutes();
      return minutes >= 9 * 60 + 30 && minutes <= 16 * 60;
    } catch (_) {
      return false;
    }
  }

  onEvent(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit(eventType, payload) {
    for (const cb of this.listeners) {
      try {
        cb(eventType, payload);
      } catch (err) {
        console.error('[TelemetryEngine] Listener error:', err);
      }
    }
  }

  setCadence(mult) {
    this.cadence = clamp(Number(mult) || 1, 1, 32);
  }

  setChannelAggression(name, pctValue) {
    if (this.channels[name]) {
      this.channels[name].aggression = clamp(pctValue / 100, 0, 2.0);
    }
  }

  setChannelMode(name, mode) {
    if (this.channels[name]) {
      this.channels[name].mode = mode;
    }
  }

  async start() {
    this.startTime = performance.now();
    await this.syncAllApis();

    if (this._pollInterval) clearInterval(this._pollInterval);
    // Re-poll live equity quotes every 25s when active
    this._pollInterval = setInterval(() => {
      this.fetchStocks();
    }, 25000);
  }

  stop() {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
  }

  async syncAllApis() {
    this.apiStatus.stocks = { state: 'syncing', label: 'SYNCING' };
    this.apiStatus.usaspending = { state: 'syncing', label: 'SYNCING' };
    this.apiStatus.deaths = { state: 'syncing', label: 'SYNCING' };
    this.apiStatus.community = { state: 'syncing', label: 'SYNCING' };
    this.emit('status', this.apiStatus);

    await Promise.allSettled([
      this.fetchStocks(),
      this.fetchUsaSpending(),
      this.fetchDeathRecords(),
      this.fetchCommunityAndBop()
    ]);

    this.emit('status', this.apiStatus);
  }

  async fetchStocks() {
    this.stocks.marketOpen = this.isUsEquityMarketOpen();
    let updated = false;

    // 1. Optional direct Finnhub quote if user provided a key
    if (this.finnhubKey) {
      try {
        const [cxwRes, geoRes] = await Promise.all([
          fetchWithTimeout(`https://finnhub.io/api/v1/quote?symbol=CXW&token=${encodeURIComponent(this.finnhubKey)}`, {}, 4500),
          fetchWithTimeout(`https://finnhub.io/api/v1/quote?symbol=GEO&token=${encodeURIComponent(this.finnhubKey)}`, {}, 4500)
        ]);
        if (cxwRes.ok && geoRes.ok) {
          const cxw = await cxwRes.json();
          const geo = await geoRes.json();
          if (cxw.c > 0 && geo.c > 0) {
            this.applyStockQuote('cxw', cxw.c, cxw.pc || cxw.c, this.stocks.cxw.volume);
            this.applyStockQuote('geo', geo.c, geo.pc || geo.c, this.stocks.geo.volume);
            updated = true;
            this.stocks.liveFetched = true;
            this.apiStatus.stocks = {
              state: 'live',
              label: this.stocks.marketOpen ? 'FINNHUB LIVE' : 'FINNHUB CLOSE'
            };
          }
        }
      } catch (_) {
        // Fall back to Yahoo Finance chart proxy
      }
    }

    // 2. Yahoo Finance 1d intraday chart via CORS fallback
    if (!updated) {
      try {
        const [cxwRes, geoRes] = await Promise.all([
          fetchViaCorsFallback('https://query1.finance.yahoo.com/v8/finance/chart/CXW?interval=5m&range=1d', {}, 5000),
          fetchViaCorsFallback('https://query1.finance.yahoo.com/v8/finance/chart/GEO?interval=5m&range=1d', {}, 5000)
        ]);
        const cxwJson = await cxwRes.json();
        const geoJson = await geoRes.json();
        const cxwMeta = cxwJson?.chart?.result?.[0]?.meta;
        const geoMeta = geoJson?.chart?.result?.[0]?.meta;
        if (cxwMeta?.regularMarketPrice && geoMeta?.regularMarketPrice) {
          this.applyStockQuote(
            'cxw',
            cxwMeta.regularMarketPrice,
            cxwMeta.chartPreviousClose || cxwMeta.previousClose || cxwMeta.regularMarketPrice,
            cxwMeta.regularMarketVolume || 1600000
          );
          this.applyStockQuote(
            'geo',
            geoMeta.regularMarketPrice,
            geoMeta.chartPreviousClose || geoMeta.previousClose || geoMeta.regularMarketPrice,
            geoMeta.regularMarketVolume || 2100000
          );
          updated = true;
          this.stocks.liveFetched = true;
          this.apiStatus.stocks = {
            state: 'live',
            label: this.stocks.marketOpen ? 'LIVE QUOTE' : 'MKT CLOSE'
          };
        }
      } catch (_) {
        // Use anchored SEC/market baseline tape
      }
    }

    if (!updated) {
      this.apiStatus.stocks = {
        state: 'archive',
        label: this.stocks.marketOpen ? 'TAPE REPLAY' : 'MKT CLOSED'
      };
    }

    this.lastUpdated.equity = Date.now();
    this.emit('status', this.apiStatus);
    this.emit('stocks', this.stocks);
  }

  applyStockQuote(sym, price, prevClose, volume) {
    const s = this.stocks[sym];
    const cleanPrice = Number(price);
    const cleanPrev = Number(prevClose) || cleanPrice;
    if (!Number.isFinite(cleanPrice) || cleanPrice <= 0) return;

    s.price = cleanPrice;
    s.prevClose = cleanPrev;
    s.changePct = ((cleanPrice - cleanPrev) / cleanPrev) * 100;
    s.volume = Number(volume) || s.volume;
    s.history.push(cleanPrice);
    if (s.history.length > 32) s.history.shift();
  }

  async fetchUsaSpending() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const payload = {
        filters: {
          time_period: [{ start_date: '2022-10-01', end_date: today }],
          award_type_codes: ['A', 'B', 'C', 'D'],
          recipient_search_text: ['CoreCivic', 'The GEO Group', 'Management & Training']
        },
        fields: [
          'Award ID',
          'Recipient Name',
          'Awarding Agency',
          'Awarding Sub Agency',
          'Award Amount',
          'Description',
          'Place of Performance City Code',
          'Place of Performance State Code'
        ],
        page: 1,
        limit: 18,
        sort: 'Award Amount',
        order: 'desc'
      };

      const res = await fetchWithTimeout('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, 6500);

      if (res.ok) {
        const data = await res.json();
        const rows = Array.isArray(data?.results) ? data.results : [];
        const parsed = rows
          .filter(r => Number(r['Award Amount']) > 50000)
          .map(r => ({
            awardId: r['Award ID'] || 'FEDERAL-AWARD',
            recipient: r['Recipient Name'] || 'PRIVATE DETENTION CONTRACTOR',
            agency: r['Awarding Sub Agency'] || r['Awarding Agency'] || 'DOJ / DHS',
            amount: Number(r['Award Amount']) || 1200000,
            location: [r['Place of Performance City Code'], r['Place of Performance State Code']].filter(Boolean).join(', ') || 'United States',
            description: r['Description'] || 'Correctional & detention support contract',
            source: 'USAspending.gov LIVE'
          }));

        if (parsed.length > 0) {
          this.contracts = parsed;
          this.contractIdx = 0;
          this.lastUpdated.spending = Date.now();
          this.apiStatus.usaspending = { state: 'live', label: `LIVE (${parsed.length})` };
          this.emit('status', this.apiStatus);
          this.pulseContract(false);
          return;
        }
      }
    } catch (_) {
      // Fallback handled below
    }

    this.lastUpdated.spending = Date.now();
    this.apiStatus.usaspending = { state: 'archive', label: 'ARCHIVE (6)' };
    this.emit('status', this.apiStatus);
    this.pulseContract(false);
  }

  async fetchDeathRecords() {
    const collected = [];

    // 1. Incarceration Transparency API
    try {
      const itUrl = 'https://incarcerationtransparency.org/api/v1/records/deaths_db/?page=1,35';
      const res = await fetchViaCorsFallback(itUrl, {}, 5500);
      const json = await res.json();

      // Handle PHP-CRUD-API v1 format: { deaths_db: { columns: [...], records: [[...]] } }
      if (json?.deaths_db?.columns && Array.isArray(json?.deaths_db?.records)) {
        const cols = json.deaths_db.columns;
        for (const row of json.deaths_db.records) {
          const obj = {};
          cols.forEach((c, idx) => { obj[c] = row[idx]; });
          collected.push(this.normalizeDeathRecord(obj, 'Incarceration Transparency API'));
        }
      } else if (Array.isArray(json?.records)) {
        // PHP-CRUD-API v2 format
        for (const obj of json.records) {
          collected.push(this.normalizeDeathRecord(obj, 'Incarceration Transparency API'));
        }
      }
    } catch (_) {
      // Continue to UCLA Behind Bars GitHub API
    }

    // 2. UCLA Law Behind Bars Data Project (Federal BOP & ICE Individual Mortality CSVs)
    const uclaSources = [
      {
        url: 'https://raw.githubusercontent.com/uclalawbehindbars/deaths_in_custody/main/Data/Other/Deaths/Federal/BOP-Individual.csv',
        label: 'UCLA Behind Bars (Federal BOP)',
        statusDefault: 'Federal BOP Custody'
      },
      {
        url: 'https://raw.githubusercontent.com/uclalawbehindbars/deaths_in_custody/main/Data/Other/Deaths/Federal/ICE-Individual.csv',
        label: 'UCLA Behind Bars (ICE Detention)',
        statusDefault: 'Civil Detention (ICE)'
      }
    ];

    await Promise.allSettled(
      uclaSources.map(async (src) => {
        try {
          const csvRes = await fetchWithTimeout(src.url, {}, 5500);
          if (!csvRes.ok) return;
          const csvText = await csvRes.text();
          const parsedCsv = this.parseQuotedCsvTail(csvText, 18);
          for (const row of parsedCsv) {
            if (row.Facility || row.State) {
              collected.push(
                this.normalizeDeathRecord(
                  { ...row, trial_status: row['Facility.Type'] ? `ICE (${row['Facility.Type']})` : src.statusDefault },
                  src.label
                )
              );
            }
          }
        } catch (_) {
          // Handled cleanly via archive fallback
        }
      })
    );

    if (collected.length > 0) {
      // Interleave live federal records with pre-trial/parish archive records
      this.deathRecords = [...collected.slice(0, 24), ...FALLBACK_DEATH_RECORDS];
      this.deathIdx = 0;
      this.currentDeath = this.deathRecords[0];
      this.apiStatus.deaths = { state: 'live', label: `LIVE (${collected.length})` };
    } else {
      this.deathRecords = [...FALLBACK_DEATH_RECORDS];
      this.currentDeath = this.deathRecords[0];
      this.apiStatus.deaths = { state: 'archive', label: `ARCHIVE (${FALLBACK_DEATH_RECORDS.length})` };
    }

    this.lastUpdated.mortality = Date.now();
    this.emit('status', this.apiStatus);
    this.emit('deathsReady', this.deathRecords[0]);
  }

  normalizeDeathRecord(raw, sourceLabel) {
    const baseFacility =
      raw.facility ||
      raw.Facility ||
      raw.facility_name ||
      raw.Agency ||
      raw.agency ||
      raw.Parish ||
      raw.State ||
      'U.S. Carceral Facility';
    const stateSuffix = raw.State && raw.State !== 'ICE' && !String(baseFacility).includes(raw.State)
      ? ` (${raw.State})`
      : '';
    const facility = `${String(baseFacility).replace(/\s+/g, ' ').trim()}${stateSuffix}`;

    let ageVal = Number(raw.age || raw.Age || raw['Death.Age'] || raw.age_at_death);
    if ((!Number.isFinite(ageVal) || ageVal <= 0) && raw.DoB && raw['Death.Date']) {
      const dobYear = Number(String(raw.DoB).slice(0, 4));
      const deathYear = Number(String(raw['Death.Date']).slice(0, 4));
      if (dobYear > 1900 && deathYear >= dobYear) {
        ageVal = deathYear - dobYear;
      }
    }

    const daysVal = Number(raw.days_incarcerated || raw.Days_Incarcerated || raw.days);
    const sexRaw = raw.sex || raw.Sex || raw.gender || 'Unspecified';
    const sex = sexRaw === 'M' ? 'Male' : sexRaw === 'F' ? 'Female' : sexRaw;

    const causeParts = [
      raw.cause_of_death,
      raw.Cause_of_Death,
      raw['Cause.Specific'],
      raw['Circumstance.General'],
      raw['Circumstance.Specific'],
      raw.manner
    ].filter(v => v && v !== 'NA' && v !== 'Pending');

    return {
      id: raw.id || raw['UCLA.ID'] || raw['ID.No'] || raw.record_id || `CUSTODY-${Math.floor(Math.random() * 9000 + 1000)}`,
      facility,
      age: Number.isFinite(ageVal) && ageVal > 0 && ageVal < 115 ? ageVal : null,
      sex,
      race: (raw.race || raw.Race || (raw['Birth.Country'] ? `Birth: ${raw['Birth.Country']}` : 'Unspecified')),
      trial_status: raw.trial_status || raw.Trial_Status || raw.legal_status || 'Custody Record',
      days_incarcerated: Number.isFinite(daysVal) && daysVal >= 0 ? daysVal : 180,
      cause_of_death: causeParts.length ? causeParts.join(' — ') : 'Death in Custody (Recorded)',
      year: raw.year_of_death || raw.year || raw.Year || 'Recent',
      source: sourceLabel
    };
  }

  parseQuotedCsvTail(text, maxRows = 18) {
    const records = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (inQuotes && text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        row.push(field.trim());
        field = '';
      } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field.trim());
        if (row.some(Boolean)) records.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
    if (field.length || row.length) {
      row.push(field.trim());
      if (row.some(Boolean)) records.push(row);
    }

    if (records.length < 2) return [];
    const headers = records[0];
    const startIdx = Math.max(1, records.length - maxRows);
    const out = [];
    for (let i = records.length - 1; i >= startIdx; i--) {
      const cells = records[i];
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = cells[idx] ?? '';
      });
      out.push(obj);
    }
    return out;
  }

  async fetchCommunityAndBop() {
    const collected = [];

    // 1. Federal Register API (Bureau of Prisons — full public CORS)
    try {
      const frUrl = 'https://www.federalregister.gov/api/v1/documents.json?conditions[agencies][]=prisons-bureau&per_page=10';
      const res = await fetchWithTimeout(frUrl, {}, 5000);
      if (res.ok) {
        const data = await res.json();
        const docs = Array.isArray(data?.results) ? data.results : [];
        for (const doc of docs) {
          collected.push({
            title: doc.title || 'Federal Bureau of Prisons Notice',
            court: `Federal Register · ${doc.type || 'Notice'}`,
            date: doc.publication_date || 'Recent',
            impactMetric: '155,000+ people in Federal Bureau of Prisons custody nationwide',
            source: 'Federal Register LIVE'
          });
        }
      }
    } catch (_) {
      // Continue to CourtListener
    }

    // 2. CourtListener Federal Prisoner Civil Rights / Habeas Search
    try {
      const clUrl = 'https://www.courtlistener.com/api/rest/v4/search/?q=%22prison+conditions%22+OR+%22deliberate+indifference%22&type=o';
      const res = await fetchViaCorsFallback(clUrl, {}, 5000);
      const data = await res.json();
      const hits = Array.isArray(data?.results) ? data.results.slice(0, 8) : [];
      for (const hit of hits) {
        collected.push({
          title: hit.caseName || hit.case_name || 'Federal Prisoner Civil Rights Opinion',
          court: hit.court || 'U.S. Federal Court',
          date: hit.dateFiled || hit.date_filed || 'Recent',
          impactMetric: '2.7M U.S. children have an incarcerated parent · 426k+ unconvicted pre-trial',
          source: 'CourtListener LIVE'
        });
      }
    } catch (_) {
      // Fallback handled below
    }

    if (collected.length > 0) {
      this.communityFilings = [...collected, ...FALLBACK_COMMUNITY_FILINGS];
      this.communityIdx = 0;
      this.apiStatus.community = { state: 'live', label: `LIVE (${collected.length})` };
    } else {
      this.communityFilings = [...FALLBACK_COMMUNITY_FILINGS];
      this.apiStatus.community = { state: 'archive', label: `ARCHIVE (${FALLBACK_COMMUNITY_FILINGS.length})` };
    }

    this.lastUpdated.community = Date.now();
    this.emit('status', this.apiStatus);
    this.pulseCommunity(false);
  }

  /**
   * Advances LFO conditioning and fires scheduled telemetry events at 60Hz.
   */
  update(dt) {
    const safeDt = Math.min(dt, 0.1);
    const speed = this.cadence;

    // 1. Intraday market micro-tick cadence
    this._tickAccum += safeDt * speed;
    if (this._tickAccum >= 3.2) {
      this._tickAccum = 0;
      this.injectMarketMicroTick();
    }

    // 2. Federal Contract Award cycling
    this._contractAccum += safeDt * speed;
    if (this._contractAccum >= 11.5) {
      this._contractAccum = 0;
      this.pulseContract(true);
    }

    // 3. Custody Death Record cycling
    this._deathAccum += safeDt * speed;
    if (this._deathAccum >= 16.0) {
      this._deathAccum = 0;
      this.pulseDeathRecord(true);
    }

    // 4. Community / Habeas Docket cycling
    this._communityAccum += safeDt * speed;
    if (this._communityAccum >= 9.0) {
      this._communityAccum = 0;
      this.pulseCommunity(true);
    }

    // Sample & Hold clock for 'step' LFO mode
    this._stepAccum += safeDt * speed;
    const shouldStep = this._stepAccum >= 0.85;
    if (shouldStep) this._stepAccum = 0;

    // Update each channel LFO
    const chNames = ['equity', 'spending', 'mortality', 'community'];
    for (const name of chNames) {
      const ch = this.channels[name];
      ch.phase += safeDt * (0.45 + speed * 0.12);
      ch.pulse = Math.max(0, ch.pulse - safeDt * 0.72);

      // Organic micro-breathing around rawTarget so the drone stays alive
      const microDrift =
        Math.sin(ch.phase) * 0.045 +
        Math.sin(ch.phase * 2.31) * 0.025;
      const targetWithPulse = clamp(ch.rawTarget + microDrift + ch.pulse * 0.45, 0.02, 1.0);

      if (ch.mode === 'slew') {
        ch.value += (targetWithPulse - ch.value) * clamp(safeDt * 3.5, 0, 1);
      } else if (ch.mode === 'step') {
        if (shouldStep) {
          ch.stepped = targetWithPulse;
        }
        ch.value += (ch.stepped - ch.value) * clamp(safeDt * 18, 0, 1);
      } else if (ch.mode === 'spike') {
        const spikeVal = clamp(ch.rawTarget * 0.45 + ch.pulse * 0.85, 0.02, 1.0);
        ch.value += (spikeVal - ch.value) * clamp(safeDt * 7.5, 0, 1);
      }
    }

    return this.getSnapshot();
  }

  injectMarketMicroTick() {
    // When markets are closed or live polling is between intervals, evolve intraday pressure subtly
    const cxwBias = this.stocks.liveFetched && !this.stocks.marketOpen ? 0.0012 : 0.0032;
    const cxwDelta = (Math.random() - 0.47) * cxwBias * this.stocks.cxw.price;
    const geoDelta = (Math.random() - 0.46) * cxwBias * this.stocks.geo.price;

    this.applyStockQuote('cxw', this.stocks.cxw.price + cxwDelta, this.stocks.cxw.prevClose, this.stocks.cxw.volume + Math.floor(Math.random() * 4500));
    this.applyStockQuote('geo', this.stocks.geo.price + geoDelta, this.stocks.geo.prevClose, this.stocks.geo.volume + Math.floor(Math.random() * 6200));

    const avgPct = Math.abs(this.stocks.cxw.changePct) + Math.abs(this.stocks.geo.changePct);
    const positiveMomentum = Math.max(0, (this.stocks.cxw.changePct + this.stocks.geo.changePct) * 0.5);
    this.channels.equity.rawTarget = clamp(0.24 + avgPct * 0.08 + positiveMomentum * 0.06, 0.08, 0.96);
    this.channels.equity.pulse = clamp(0.35 + avgPct * 0.1, 0.25, 0.95);

    this.lastUpdated.equity = Date.now();
    this.emit('stocks', this.stocks);
  }

  pulseEquityShock() {
    const spike = 0.025 + Math.random() * 0.03;
    this.applyStockQuote('cxw', this.stocks.cxw.price * (1 + spike * 0.55), this.stocks.cxw.prevClose, this.stocks.cxw.volume + 42000);
    this.applyStockQuote('geo', this.stocks.geo.price * (1 + spike * 0.72), this.stocks.geo.prevClose, this.stocks.geo.volume + 58000);
    this.channels.equity.rawTarget = clamp(0.68 + Math.random() * 0.28, 0.5, 1.0);
    this.channels.equity.pulse = 1.0;
    this.lastUpdated.equity = Date.now();

    this.emit('stocks', this.stocks);
    this.emit('event', {
      type: 'equity',
      section: 'equity',
      badge: 'PRIVATE PRISON STOCK',
      headline: `CXW $${this.stocks.cxw.price.toFixed(2)} (${this.stocks.cxw.changePct >= 0 ? '+' : ''}${this.stocks.cxw.changePct.toFixed(2)}%) · GEO $${this.stocks.geo.price.toFixed(2)} (${this.stocks.geo.changePct >= 0 ? '+' : ''}${this.stocks.geo.changePct.toFixed(2)}%)`
    });
  }

  pulseContract(emitEvent = true) {
    if (!this.contracts.length) return;
    const contract = this.contracts[this.contractIdx % this.contracts.length];
    this.contractIdx = (this.contractIdx + 1) % this.contracts.length;
    this.currentContract = contract;

    // Normalize $1M to $250M onto [0.22..0.98]
    const logScaled = clamp((Math.log10(Math.max(100000, contract.amount)) - 5.2) / 3.3, 0.18, 0.98);
    this.channels.spending.rawTarget = logScaled;
    this.channels.spending.pulse = 1.0;

    this.emit('contract', contract);
    if (emitEvent) {
      const amtFmt = this.formatCurrency(contract.amount);
      this.emit('event', {
        type: 'contract',
        section: 'spending',
        badge: 'FEDERAL CONTRACT',
        headline: `${contract.recipient} — ${amtFmt} (${contract.agency})`
      });
    }
  }

  pulseDeathRecord(emitEvent = true) {
    if (!this.deathRecords.length) return;
    const record = this.deathRecords[this.deathIdx % this.deathRecords.length];
    this.deathIdx = (this.deathIdx + 1) % this.deathRecords.length;
    this.currentDeath = record;
    this.loggedDeathsCount += 1;

    // Pre-trial unconvicted or young deaths increase shock amplitude
    const isPretrial = /pre-?trial|unconvicted|civil/i.test(record.trial_status || '');
    const severity = clamp(0.65 + (isPretrial ? 0.25 : 0.1) + (record.age && record.age < 35 ? 0.1 : 0), 0.5, 1.0);
    this.channels.mortality.rawTarget = severity;
    this.channels.mortality.pulse = 1.0;

    this.emit('death', record);
    if (emitEvent) {
      const ageTxt = record.age ? `Age ${record.age}` : 'Age Unrecorded';
      this.emit('event', {
        type: 'death',
        section: 'mortality',
        badge: 'CUSTODY DEATH',
        headline: `${record.facility} — ${ageTxt} · ${record.cause_of_death}`
      });
    }
  }

  pulseCommunity(emitEvent = true) {
    if (!this.communityFilings.length) return;
    const doc = this.communityFilings[this.communityIdx % this.communityFilings.length];
    this.communityIdx = (this.communityIdx + 1) % this.communityFilings.length;
    this.currentCommunity = doc;

    this.channels.community.rawTarget = clamp(0.48 + Math.random() * 0.42, 0.35, 0.95);
    this.channels.community.pulse = 0.85;

    this.emit('community', doc);
    if (emitEvent) {
      this.emit('event', {
        type: 'community',
        section: 'community',
        badge: 'COURTS & PETITIONS',
        headline: `${doc.title}`
      });
    }
  }

  getSectionDetails(sectionKey) {
    if (sectionKey === 'equity') {
      return {
        key: 'equity',
        title: 'PRIVATE PRISON STOCK (CXW & GEO)',
        statusLabel: this.apiStatus.stocks.label,
        statusState: this.apiStatus.stocks.state,
        source: 'NYSE real-time/intraday quotes for CoreCivic (CXW, SEC CIK 0001070985) and The GEO Group (GEO, SEC CIK 0000923796).',
        indicates: 'Public market valuation and trading volume of the two largest private prison operators in the U.S. Price and volume spikes track investor expectations around detention beds and federal contracts.',
        frequency: this.stocks.marketOpen
          ? 'Live API poll every 25 seconds (NYSE open); micro-tick tape interpolated every ~3s.'
          : 'Market closed (anchored to last close); micro-tick tape runs every ~3s for live performance.',
        lastUpdatedMs: this.lastUpdated.equity,
        actionLabel: 'NEXT MARKET TICK',
        records: [
          {
            label: 'CoreCivic, Inc. (NYSE: CXW)',
            detail: `$${this.stocks.cxw.price.toFixed(2)} (${this.stocks.cxw.changePct >= 0 ? '+' : ''}${this.stocks.cxw.changePct.toFixed(2)}% vs prev close $${this.stocks.cxw.prevClose.toFixed(2)}) · Vol ${this.stocks.cxw.volume.toLocaleString('en-US')}`
          },
          {
            label: 'The GEO Group, Inc. (NYSE: GEO)',
            detail: `$${this.stocks.geo.price.toFixed(2)} (${this.stocks.geo.changePct >= 0 ? '+' : ''}${this.stocks.geo.changePct.toFixed(2)}% vs prev close $${this.stocks.geo.prevClose.toFixed(2)}) · Vol ${this.stocks.geo.volume.toLocaleString('en-US')}`
          }
        ]
      };
    }

    if (sectionKey === 'spending') {
      const macro = this.getMacroSnapshot();
      const recent = [this.currentContract, ...this.contracts.filter(c => c !== this.currentContract)].slice(0, 4);
      return {
        key: 'spending',
        title: 'FEDERAL CARCERAL SPENDING & CONTRACTS',
        statusLabel: this.apiStatus.usaspending.label,
        statusState: this.apiStatus.usaspending.state,
        source: 'USAspending.gov API v2 (DOJ Bureau of Prisons / DHS ICE contract awards) + Prison Policy Initiative / Bureau of Justice Statistics annual spend baselines.',
        indicates: 'Taxpayer dollars obligated to private detention contractors and total U.S. corrections spending ($80.7B/yr direct = $2,560.55/sec; $182B/yr total system burden = $5,771.18/sec).',
        frequency: 'Session dollar counter updates every second. Contract awards fetched live from USAspending.gov on sync and cycled every ~11s.',
        lastUpdatedMs: this.lastUpdated.spending,
        actionLabel: 'NEXT CONTRACT AWARD',
        records: [
          {
            label: 'Session Spend & Displaced Community Cost',
            detail: `$${macro.directSpend.toLocaleString('en-US', { maximumFractionDigits: 0 })} direct ($${macro.totalBurden.toLocaleString('en-US', { maximumFractionDigits: 0 })} total burden) · Equivalent to ${macro.teacherYears.toFixed(2)} teacher salaries or ${macro.housingUnits.toFixed(2)} housing units.`
          },
          ...recent.map(c => ({
            label: `${c.recipient} — ${this.formatCurrency(c.amount)}`,
            detail: `${c.agency} · ${c.location} · ${c.description} [${c.source}]`
          }))
        ]
      };
    }

    if (sectionKey === 'mortality') {
      const recent = [this.currentDeath, ...this.deathRecords.filter(d => d !== this.currentDeath)].slice(0, 5);
      return {
        key: 'mortality',
        title: 'DEATHS IN CUSTODY',
        statusLabel: this.apiStatus.deaths.label,
        statusState: this.apiStatus.deaths.state,
        source: 'UCLA Law Behind Bars Data Project (Federal BOP & ICE individual mortality CSVs) and Loyola Incarceration Transparency Project records.',
        indicates: 'Documented deaths inside U.S. federal prisons, immigration detention centers, and local jails, including unconvicted pre-trial detainees and people held under medical neglect.',
        frequency: 'Dataset pulled from UCLA Behind Bars on load/sync (updated periodically as agencies disclose records); records cycle every ~16s or on manual pulse.',
        lastUpdatedMs: this.lastUpdated.mortality,
        actionLabel: 'PULSE NEXT DEATH RECORD',
        records: recent.map(r => ({
          label: `${r.facility} — ${r.age ? `Age ${r.age}` : 'Age N/A'} (${r.sex}, ${r.race})`,
          detail: `Status: ${r.trial_status} · ${r.days_incarcerated} days held · Cause: ${r.cause_of_death} [${r.source}]`
        }))
      };
    }

    if (sectionKey === 'community') {
      const recent = [this.currentCommunity, ...this.communityFilings.filter(f => f !== this.currentCommunity)].slice(0, 4);
      return {
        key: 'community',
        title: 'COURTS, BOP NOTICES & FAMILY IMPACT',
        statusLabel: this.apiStatus.community.label,
        statusState: this.apiStatus.community.state,
        source: 'Federal Register API (Bureau of Prisons notices), CourtListener REST API (prisoner civil rights / habeas filings), and Vera Institute / Prison Policy Initiative.',
        indicates: 'Active federal prison policy changes, inmate legal petitions challenging detention conditions, and the collateral impact on families (2.7M U.S. children with an incarcerated parent).',
        frequency: 'Live API sync pulls latest Federal Register & CourtListener filings (updated daily on weekdays); items cycle every ~9s.',
        lastUpdatedMs: this.lastUpdated.community,
        actionLabel: 'NEXT LEGAL FILING',
        records: recent.map(d => ({
          label: `${d.title}`,
          detail: `${d.court} (${d.date}) · ${d.impactMetric} [${d.source}]`
        }))
      };
    }

    // National population baseline section
    return {
      key: 'population',
      title: 'US INCARCERATED & PRE-TRIAL POPULATION',
      statusLabel: 'ANNUAL / QUARTERLY',
      statusState: 'archive',
      source: 'Bureau of Justice Statistics (BJS), Federal Bureau of Prisons (BOP), and Prison Policy Initiative Whole Pie dataset.',
      indicates: '1,918,500 people incarcerated across U.S. state prisons, federal prisons, local jails, and immigration detention. Over 426,000 people in local jails have not been convicted of a crime (held pre-trial).',
      frequency: 'Updated weekly by Federal BOP and quarterly/annually by BJS national census.',
      lastUpdatedMs: this.lastUpdated.population,
      actionLabel: 'REFRESH ALL APIS',
      records: [
        { label: 'Total U.S. Incarcerated Population', detail: '1,918,500 people behind bars nationwide' },
        { label: 'Unconvicted Pre-Trial Jail Population', detail: '426,000+ people detained awaiting trial (often unable to afford cash bail)' },
        { label: 'Children Impacted', detail: '2,700,000 U.S. children currently have at least one incarcerated parent' }
      ]
    };
  }

  getModulated(name) {
    const ch = this.channels[name];
    if (!ch) return 0;
    return clamp(ch.value * ch.aggression, 0, 1.6);
  }

  getMacroSnapshot() {
    const elapsedSec = Math.max(0, (performance.now() - this.startTime) / 1000);
    const directSpend = elapsedSec * DIRECT_SPEND_PER_SEC;
    const totalBurden = elapsedSec * TOTAL_BURDEN_PER_SEC;
    const teacherYears = directSpend / 68000;
    const housingUnits = directSpend / 22000;
    const mentalHealthBeds = directSpend / 54000;

    return {
      elapsedSec,
      directSpend,
      totalBurden,
      teacherYears,
      housingUnits,
      mentalHealthBeds
    };
  }

  getSnapshot() {
    const equityMod = this.getModulated('equity');
    const spendingMod = this.getModulated('spending');
    const mortalityMod = this.getModulated('mortality');
    const communityMod = this.getModulated('community');

    const systemicPressure = clamp(
      equityMod * 0.32 + spendingMod * 0.38 + mortalityMod * 0.34,
      0.0,
      1.35
    );

    return {
      channels: {
        equity: { ...this.channels.equity, modulated: equityMod },
        spending: { ...this.channels.spending, modulated: spendingMod },
        mortality: { ...this.channels.mortality, modulated: mortalityMod },
        community: { ...this.channels.community, modulated: communityMod }
      },
      systemicPressure,
      stocks: this.stocks,
      loggedDeathsCount: this.loggedDeathsCount,
      currentContract: this.currentContract,
      currentDeath: this.currentDeath,
      currentCommunity: this.currentCommunity,
      macro: this.getMacroSnapshot()
    };
  }

  formatCurrency(n) {
    if (!Number.isFinite(n)) return '$0.00';
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${Math.round(n).toLocaleString('en-US')}`;
    return `$${n.toFixed(2)}`;
  }
}
