# ED:SitAware (Elite Dangerous Situational Awareness)

> **Zero-click ambient tactical radar & two-way EDDN companion for Commanders.**  
> Automatically reads your current system and ship loadout to render an instant, customisable briefing of everything happening within your immediate Light-Year bubble—while optionally feeding fresh market and station data back to the community via EDDN.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-Pre--Alpha-orange.svg)
![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Windows%20.exe%20%7C%20Linux-lightgrey.svg)

## Why ED:SitAware?
Inara and Spansh are unmatched databases, but they are **search-driven**. Every time you jump into a new sector, you have to alt-tab, open multiple tabs, type your current system name, and re-apply filters.

**ED:SitAware** flips the workflow:
* **Zero Typing:** Watches your local `Journal` folder directly in the browser (via the File System Access API) or via our lightweight desktop `.exe` wrapper (Tauri).
* **Two-Way EDDN Citizen:** Consumes live galaxy intelligence *and* (with a single opt-in toggle) uploads your station visits and market scans straight to the **Elite Dangerous Data Network (EDDN)**—keeping Inara, Spansh, and ED:SitAware accurate for every Commander.
* **Ship-Aware Filtering:** Automatically detects your current ship's landing pad size and jump range from your `Loadout` event so you never get routed to a Medium-only outpost in a Cutter.
* **Modular "Checkbox Everything" Grid:** Toggle any intelligence card on or off independently. Start with built-in **Role Presets** (Trader, Miner, Bounty Hunter, Explorer, Coloniser) or tweak any combination to save your own **Custom Profiles**.

## Core Features
* **Universal Utilities (Always Accessible):** Nearest Material Traders (Raw, Manufactured, Encoded), Interstellar Factors, Tech Brokers, and Station Services—pinnable across all profiles.
* **Data Freshness & Trap Warnings:** Colour-coded data age indicators, Fleet Carrier exclusion toggles, and automatic alerts for long supercruise traps (`> 5,000 Ls`), high-G planetary ports, or Lockdown states.
* **Role Presets + Custom Profiles:** One-click playstyle switching with full checkbox customisation and JSON profile export/import.
* **Strategic Powerplay 2.0 & Colonisation Roadmaps *(Post-MVP)*:** Simplified interactive guides and multi-step waypoint roadmaps showing how system colonisation, faction states, and Powerplay activities interact.

## Project Documentation & References
* [Product Requirements Document (`PRD.md`)](./PRD.md) — Full feature breakdown, UX architecture, and MVP vs. Post-MVP scope.
* [Technical Architecture (`ARCHITECTURE.md`)](./ARCHITECTURE.md) — Data flow, spatial queries, and ship pad mapping.
* [References & Community Research (`REFERENCES.md`)](./REFERENCES.md) — Data sources, ecosystem tools, and community pain points that shaped this project.
* [Contributing (`CONTRIBUTING.md`)](./CONTRIBUTING.md) — How to report bugs, pitch widgets, and submit pull requests.

## Quick Start (Local Development)
> **Pre-alpha:** the application itself has not landed in this repository yet, so the commands below will only work once the first code drop is merged.

```bash
git clone https://github.com/jerryagenyi/ed-sitaware.git
cd ed-sitaware
npm install
npm run dev
```

## A Note on How This Project Is Built

I love software development and have a solid grounding in how modern software architecture and product management work, though I am not a full-time career programmer. I approach building from a product-first perspective—focusing on user workflows, clear specifications, and clean system design—while leaning on modern AI-assisted development tools to help translate those ideas into working code.

Because of that, constructive code reviews, architectural suggestions, and pull requests from seasoned Commanders and developers are warmly welcomed. Fly safe, CMDRs! o7

## Data Sources & Attribution

Powered by community data from the **Elite Dangerous Data Network (EDDN)**, **Spansh**, and **EDSM**.

*Elite Dangerous is a trademark of Frontier Developments plc. This project is not affiliated with Frontier Developments.*
