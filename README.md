# JUSTICE SYNTH

A live-performance Web Audio synthesizer and visual telemetry instrument driven by U.S. incarceration spending, private prison equities, custody mortality records, and prisoner civil-rights filings.

## Key Features

* **Visual-First Data Console:** Interactive data nodes, memorial constellation, and dual oscilloscope with zero synth jargon on the frontend.
* **Bare-Bones Data Inspector:** Click any section, channel card, `INFO` button, or visual node to inspect the exact source, what the metric indicates, update cadence, `Last updated` timestamp, and un-truncated records.
* **Full Key & Mode Support:** Transpose the entire instrument across all 12 root keys (`C`–`B`), 9 musical modes (`Dorian`, `Natural Minor`, `Phrygian`, `Harmonic Minor`, `Major`, `Lydian`, `Mixolydian`, `Minor Pentatonic`, `Open Fifths`), and `440 Hz` / `432 Hz` reference tuning for live sets with other instruments.
* **Hybrid Synth Engine Backend (`B`):** Vital/Serum-style wavetable choir, Dexed-style 4-Operator FM metallic cluster, 3-band sculptural noise, concrete cell comb resonator, and custom `AudioWorklet` wavefolder/bitcrusher protected by a `-2.0 dBFS` brickwall limiter.

## Live Telemetry Sources

1. **Private Prison Stock (`NYSE: CXW`, `NYSE: GEO`):** Intraday equity quotes / market close tape (`SEC CIK 0001070985` / `0000923796`).
2. **Federal Carceral Spending (`USAspending.gov API v2`):** DOJ Bureau of Prisons & DHS ICE contract awards plus continuous session expenditure (`$2,560.55/sec` direct, `$5,771.18/sec` total burden).
3. **Custody Mortality (`UCLA Law Behind Bars` & `Incarceration Transparency`):** Individual BOP, ICE detention, and jail mortality records.
4. **Courts & Families (`Federal Register BOP API`, `CourtListener`, `Vera / PPI`):** Live Bureau of Prisons notices, prisoner civil-rights filings, and family/pre-trial metrics.

## Live Shortcuts

* **`Space` / `M`**: Mute / Unmute Audio
* **`D`**: Pulse Custody Death Record
* **`C`**: Pulse Federal Contract Award
* **`S`**: Latch Human Force Balance
* **`B`**: Toggle Synth Engine Backend Drawer
* **`F`**: Toggle Fullscreen Stage
* **`Esc`**: Close Data Inspector
