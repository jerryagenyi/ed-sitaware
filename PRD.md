# Product Requirements Document (PRD): ED:SitAware

## 1. Product Vision
**ED:SitAware** is an ambient, second-screen situational awareness dashboard and lightweight EDDN contributor for *Elite Dangerous*. Instead of forcing Commanders to run repetitive manual searches, it continuously watches the player's local `Journal` logs and renders a modular, customisable tactical briefing of opportunities, hazards, and services within a chosen Light-Year (LY) radius.

---

## 2. Distribution Strategy: Web-First + Lightweight `.exe`
1. **Browser Web App (Zero Install):** Uses the Chromium **File System Access API** to read the local `Saved Games/Frontier Developments/Elite Dangerous` directory client-side. Ideal for quick testing, secondary devices, and players who don't want extra background programs. (Chromium-only: Chrome and Edge, not Firefox or Safari.)
2. **Desktop Executable (`.exe` / AppImage via Tauri):** Wraps the exact same web UI in a ~10 MB native shell with system-tray support, automatic background folder watching (no manual folder re-selection on restart), and persistent EDDN uploading.
3. **No Account, Ever:** Nothing is stored on a server. Profiles, filters and theme live in the browser's own storage (`localStorage`); the journal folder the player chose is remembered by the browser where it supports that, so a return visit is one click. The desktop build keeps the same settings in a local config file. The journal folder is opened read-only.

---

## 3. Core UX Architecture: Modular Toggles & Profiles

### 3.1 The "Checkbox Everything" Architecture
Every intelligence module in ED:SitAware is an independent, toggleable widget card:
* **Master Widget Drawer:** Players can check or uncheck any module at any time regardless of their active role.
* **Universal Pinning:** Essential utilities (e.g., *Material Traders*, *Interstellar Factors*, *Tech Brokers*) can be pinned so they remain visible across every profile.
* **Per-Widget Inline Filters:** Each card includes quick controls (e.g., max supercruise distance in Ls, exclude Fleet Carriers, max data age in hours).

### 3.2 Role Presets & Custom Profiles
Role Presets are **curated starting templates of checked widgets and filter defaults**—never restrictive modes:
* **Built-in Presets:**
  * *General / Bubble Runner:* Nearest Ports, Material Traders, Interstellar Factors, Sector Hazard Alerts.
  * *Trader / Coloniser:* Top Exports/Imports in Radius, Bulk Supply Finder, Large Pad Lock, Fleet Carrier Filter.
  * *Miner:* Pristine Metallic/Icy Rings, Hotspot Overlap Finder, Nearest High-Sell Station.
  * *Combat / Mercenary:* HazRES & Conflict Zones, Interstellar Factors, Tech Brokers, Massacre Stacking Hubs.
  * *Explorer / Exobio:* Unvisited Systems, High-Value Bio/Terraformable Candidates, Nearest Vista Genomics & DSSA Carriers.
* **Custom Profiles:**
  * Modifying any checkbox, radius slider, or filter threshold activates a **"Save as Custom Profile"** option.
  * Stored locally (`localStorage` / desktop config) with JSON Export/Import for sharing builds with squadrons.

---

## 4. Feature Roadmap: MVP vs. Post-MVP

### Phase 1: MVP (Core Loop, Local Sync & EDDN Feed)
*Goal: Deliver an ultra-fast, zero-typing tactical radar that solves daily navigation friction and contributes clean data back to EDDN.*

1. **Commander Location & Ship Telemetry Sync:**
   * Watches `Journal.*.log` + `Market.json`, `Outfitting.json`, and `Shipyard.json`.
   * Parses `Location`, `FSDJump`, `Docked`, `Undocked`, `Loadout` (ship type, pad size, maximum jump range), and `Cargo`.
2. **Global Tactical Control Bar:**
   * Search Radius Slider (`10 LY` to `100 LY`, default `25 LY`).
   * Ship Pad Size Filter (`Auto from Ship` / `Any` / `Medium+` / `Large Only`).
   * Exclude Fleet Carriers toggle (`ON` by default).
   * Supercruise Limit slider (`5,000 Ls` default, adjustable from `1,000 Ls` to `100,000 Ls`).
   * Profile Switcher + "Customise Widgets" checkbox drawer.
3. **MVP Intelligence Modules (All Toggleable):**
   * **Nearest Ports & Services:** Ranked by LY distance + Ls from arrival star. Displays pad size, economy, allegiance, and colour-coded data age (`🟢 <2h`, `🟡 <24h`, `🔴 >24h`).
   * **Universal Utilities Finder:** Nearest Raw, Manufactured, and Encoded Material Traders, Interstellar Factors, and Human/Guardian Tech Brokers.
   * **Local Market Snapshot:** Top profitable exports from current station/system and top imports within LY radius.
   * **Mining & Reserves Scanner:** Systems within radius with Pristine/Major reserves and ring compositions (Metallic, Metal-Rich, Rocky, Icy).
   * **"Gotcha" Hazard Alerts:** Automatic warning tags for Planetary Surface ports, High-G worlds (`> 1.5G`), Lockdown/Infrastructure Failure states, and approaches longer than the player's supercruise limit.
4. **Opt-In EDDN Telemetry Uploader:**
   * Toggleable switch (`Share Market & System Data with EDDN`).
   * Sanitises outbound data — only EDDN-whitelisted journal events are eligible, with all Commander-specific fields (e.g. `FID`, `Wanted`, `ActiveFine`) and `_Localised` keys removed — and validates every payload against the official `eddn.edcd.io` schemas (`journal/1`, `commodity/3`, `outfitting/2`, `shipyard/2`) before uploading quietly in the background.

---

### Phase 2: Post-MVP (Strategic Roadmaps & Deep Intelligence)
*Goal: Go beyond raw lookups by turning complex, veteran-only mechanics into guided, actionable roadmaps.*

1. **Powerplay 2.0 Strategic Roadmap & Simplified Companion:**
   * **Interactive Goal Builder:** Commander selects an objective (e.g., *"Rank up for module unlocks"*, *"Reinforce a Stronghold"*, *"Undermine a rival system"*, or *"Expand Power via Colonisation"*).
   * **Guided Activity Waypoints:** Translates complex Powerplay 2.0 rules, BGS/faction states, and system control tiers (Unoccupied, Exploited, Fortified, Stronghold) into step-by-step waypoint checklists tailored to the player's current sector.
   * **Simplified Inline Primers:** Plain-English tactical tooltips explaining *why* a specific activity works in the current system state (e.g., matching allocated resources, power kill rules, and merit efficiency).
2. **Colonisation & Powerplay Synergy Planner:**
   * Tracks active `ColonisationConstructionDepot` cargo requirements from the player's journal and plots nearest bulk commodity sources.
   * Explains and models how colonising a system affects neighbouring Powerplay control spheres, optimal timing, and economy seeding.
3. **Live EDDN Firehose Listener (Backend):**
   * Real-time ZeroMQ worker (`tcp://eddn.edcd.io:9500`) updating market prices, station states, and Fleet Carrier presence within seconds of any Commander docking.
4. **Massacre Mission Stacking Detector:**
   * Identifies nearby systems whose factions exclusively issue pirate massacre missions targeting a single neighbouring Anarchy/Low-Sec system.
5. **Mobile / Tablet QR Companion Mode:**
   * Local WebSocket bridge allowing the desktop `.exe` to stream live tactical updates to a phone or tablet on the same Wi-Fi network.

---

## 5. Non-Functional & Community Standards
* **EDDN Compliance:** Strict adherence to `EDCD/EDDN` developer guidelines (software name/version headers, `gameversion`/`gamebuild` headers, schema validation, deduplication, and zero personal data leakage).
* **Latency:** In the browser, a new `Journal` line is on screen within `500ms` of being written (a `250ms` poll plus parsing); the desktop build watches the file natively and updates within `250ms`. See ARCHITECTURE §5.
* **Resource Use:** Nothing is polled while disconnected. While connected, a poll that finds nothing costs one file-size check; polling slows to once a second once the journal has been quiet for five minutes or the session has ended.
* **Cockpit UI:** High-contrast dark theme with Elite-inspired Amber/Orange, Cyan, and Neutral Slate colour schemes.
