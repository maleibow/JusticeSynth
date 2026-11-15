# CELL // SIGNAL — Carceral Industrial Telemetry & Drone Synthesizer

A live-performance Web Audio synthesizer and telemetry instrument that transforms real-time and near-real-time data from the United States prison-industrial complex into a dual-layer soundscape and explicit stage visualization.

## Sonic Philosophy: Beauty Underneath vs. Systemic Suppression

* **Layer I — The Human Sanctuary Bed (Vital / Serum-Inspired Wavetable Choir):** A warm, lush multi-voice stereo wavetable choir with formant morphing, sub-harmonic heartbeat, and cathedral shimmer reverb.
* **Layer II — The Carceral Apparatus (Dexed 4-Operator FM + 3-Band Industrial Noise + AudioWorklet Wavefolder/Bitcrusher + Cell Comb):** Inharmonic metallic FM ratios (`1 : 1.41 : 2.72 : 3.83`), 60Hz fluorescent ballast hum, concrete cell acoustic comb resonance, and sculptural noise.
* **The Struggle:** As incoming carceral telemetry rises, the system compresses, detunes, wavefolds, and constricts the sanctuary choir. The performer uses the **Human Sanctuary XY / Struggle Pad** to push beauty upward through the systemic gravity.
* **Custody Death Rupture:** Each custody mortality record triggers an aggressive FM iron-slam, bitcrushed noise tear, momentary sanctuary breath cutout, and a lingering memorial bell tuned from the decedent's age, `days_incarcerated`, and `trial_status` (adding a dissonant tritone partial for unconvicted pre-trial detainees), while placing an inspectable star in the upper Memorial Constellation.

## Live & Near-Real-Time Telemetry Sources

1. **Private Prison Equity (`NYSE: CXW` CoreCivic & `NYSE: GEO` The GEO Group):** Live intraday market quotes (via Yahoo Finance / optional Finnhub token) and SEC EDGAR CIK anchors (`0001070985`, `0000923796`) driving FM metallic index, pitch detune, and cell comb tension.
2. **Federal Carceral Spending (`USAspending.gov API v2`):** Live federal BOP / DHS ICE contract awards to private detention operators (`CoreCivic`, `GEO Group`, `Management & Training`) plus the continuous `$2,560.55/sec` direct corrections & `$5,771.18/sec` total societal burden ticker.
3. **Custody Mortality (`Incarceration Transparency API` & `UCLA Law Behind Bars`):** Facility-level custody death records driving bitcrush rupture, noise tear, and memorial bells.
4. **Legal Resistance & Community Impact (`Federal Register BOP API`, `CourtListener`, & `Vera / PPI`):** Live Bureau of Prisons notices, federal prisoner civil-rights opinions, and community impact data driving the formant choir beneath the noise.

## Live Performance Controls & Shortcuts

* **`Space` / `M`**: Mute / Unmute Audio Output (Brickwall Limiter active at `-2.0 dBFS`)
* **`D`**: Immediately pulse and memorialize the next Custody Death Record
* **`C`**: Immediately pulse the next Federal Contract Award
* **`S`**: Toggle Sanctuary Latch (hold beauty upward against systemic gravity)
* **`B`**: Toggle the collapsible Synth Engine Backend Drawer (Vital / Dexed / Serum parameters & 5 presets)
* **`F`**: Toggle Stage Fullscreen Mode

## Running Locally & Deploying to GitHub Pages

Because `CELL // SIGNAL` uses pure ES modules with zero build step, any static HTTPS or `localhost` server works immediately:

```bash
python3 -m http.server 8090
```

Then open `http://localhost:8090` on desktop or mobile. To deploy online for mobile live performance, push this directory to GitHub and enable **Settings → Pages → GitHub Actions** (the included `.github/workflows/deploy.yml` publishes automatically on push to `main`).
