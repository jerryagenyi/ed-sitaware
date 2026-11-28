# Technical Architecture: ED:SitAware

## 1. Two-Way Ecosystem Data Flow

```text
                      ┌────────────────────────────────────────────┐
                      │ Elite Dangerous Game Client                │
                      │ (Journal.*.log, Market.json, etc.)         │
                      └──────────────────────┬─────────────────────┘
                                               │ reads locally
                                               ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ED:SitAware Client (Next.js Web App OR Tauri .exe Desktop Wrapper)                           │
│ ├── Journal Watcher & Parser (Client-Side)                                                   │
│ ├── Zustand Profile & Widget Checkbox Store (localStorage / disk)                            │
│ └── [Opt-In] EDDN Sanitiser & Uploader ──────► POST https://eddn.edcd.io:4430/upload/        │
└─────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                               │ GET /api/sector?system=Sol&radius=25
                                               ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ED:SitAware Backend API (Node.js / Fastify + PostgreSQL + Redis)                             │
│ ├── 3D Spatial Bounding-Box + Euclidean Distance Engine                                      │
│ └── Data Ingestion: Spansh Nightly Dumps + Live ZeroMQ EDDN Relay (tcp://eddn.edcd.io:9500)  │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2. Tech Stack

* **Frontend:** Next.js 16 (App Router, TypeScript) + Tailwind CSS 4 + Zustand 5 (state management). Design tokens live as CSS custom properties on `:root`, with four themes (`amber`, `cyan`, `slate`, `light`) switched by `data-theme` on `<html>`. A script in the document head sets the theme before the first paint: the stored one, or, for a player who has not chosen, the system's own light or dark setting. Cards are reordered with dnd-kit (pointer, touch and keyboard); the order is one more stored setting.
* **Desktop Packaging (planned):** **Tauri v2** (compiles the frontend into a lightweight Windows `.exe` / Linux binary with native filesystem watching and system tray support).
* **Backend & Spatial DB (planned):** Node.js + **PostgreSQL** (indexed 3D `x`, `y`, `z` star coordinates) + **Redis** (5-minute cache for sector queries).
* **Tests:** Vitest with Testing Library. Logic under `src/lib/` is pure and tested without a browser; the dashboard has component tests that play the demo session.
* **EDDN Integration:**
  * **Outbound (Client):** Validated JSON POSTs to `https://eddn.edcd.io:4430/upload/` with `uploaderID` anonymised (hashed Commander name — the EDDN relay obfuscates it again on receipt), `softwareName: "ED:SitAware"`, a semantic `softwareVersion` (bumped whenever the content of our messages changes), and `gameversion` / `gamebuild` taken from the journal's `Fileheader` event. The gateway enables CORS, so the browser client can upload directly without a proxy. Rules enforced upstream, per the [live EDDN developer documentation](https://github.com/EDCD/EDDN/blob/live/docs/Developers.md):
    * HTTP/1.1 over TLS, `Content-Type: application/json`, body no larger than 1 MiB.
    * Only whitelisted journal events may be sent (`Docked`, `FSDJump`, `Location`, `CarrierJump`, `Scan`, `SAASignalsFound`, `CodexEntry`), with every mandated elision applied — no Commander-specific fields, no `_Localised` keys.
    * Never retry a `400` or `426`; wait at least one minute before retrying anything else.
    * While developing or testing, append `/test` to the `$schemaRef` — never send non-live data to the live schemas.
  * **Inbound (Server — Phase 2):** Python/Node worker subscribing to `tcp://eddn.edcd.io:9500` via `zeromq` (subscribe to the empty topic `''`; each message is zlib-compressed JSON) to update markets and station states live.

## 3. Ship Pad Size Mapping (Auto-Detection)

When the parser reads a `Loadout` event from `Journal.*.log`, its `Ship` field carries the ship's symbolic name. That name maps to the smallest landing pad the ship can dock on, which drives the *Auto from Ship* pad filter:

* **Match on a normalised name.** Lower-case the value and strip `_`, `.` and spaces before lookup. The journal's own casing is not consistent: `Loadout.Ship` is always lower-case (`cobramkiii`, `explorer_nx`), `LoadGame.Ship` is mixed-case (`CobraMkIII`, `Explorer_NX`), and third-party references use a third form (`Krait_MkII`). Never rely on exact spelling or casing. (Checked against real `Loadout` events from game version 4.4.)
* **Unmapped ships are treated as Large.** When Frontier adds a ship, its name will not be in the table until we add it. Defaulting to Large fails safe: the worst case is a temporarily over-filtered port list, never a large ship sent to a Medium-only outpost. The UI flags an unmapped ship so it can be reported.
* **Players can always override.** The pad filter offers `Any` / `Medium+` / `Large Only` alongside `Auto from Ship`.

| Ship | `Loadout.Ship` | Pad |
|---|---|---|
| Adder | `adder` | S |
| Cobra Mk III | `cobramkiii` | S |
| Cobra Mk IV | `cobramkiv` | S |
| Cobra Mk V | `cobramkv` | S |
| Diamondback Explorer | `diamondbackxl` | S |
| Diamondback Scout | `diamondback` | S |
| Dolphin | `dolphin` | S |
| Eagle | `eagle` | S |
| Hauler | `hauler` | S |
| Imperial Courier | `empire_courier` | S |
| Imperial Eagle | `empire_eagle` | S |
| Kestrel Mk II | `smallcombat01_nx` | S |
| Sidewinder | `sidewinder` | S |
| Viper Mk III | `viper` | S |
| Viper Mk IV | `viper_mkiv` | S |
| Vulture | `vulture` | S |
| Alliance Challenger | `typex_3` | M |
| Alliance Chieftain | `typex` | M |
| Alliance Crusader | `typex_2` | M |
| Asp Explorer | `asp` | M |
| Asp Scout | `asp_scout` | M |
| Corsair | `corsair` | M |
| Federal Assault Ship | `federation_dropship_mkii` | M |
| Federal Dropship | `federation_dropship` | M |
| Federal Gunship | `federation_gunship` | M |
| Fer-de-Lance | `ferdelance` | M |
| Keelback | `independant_trader` | M |
| Krait Mk II | `krait_mkii` | M |
| Krait Phantom | `krait_light` | M |
| Lynx Highliner | `mediumtransport01` | M |
| Mamba | `mamba` | M |
| Mandalay | `mandalay` | M |
| Python | `python` | M |
| Python Mk II | `python_nx` | M |
| Type-6 Transporter | `type6` | M |
| Type-8 Transporter | `type8` | M |
| Type-11 Prospector | `lakonminer` | M |
| Anaconda | `anaconda` | L |
| Anaconda Mk II | `anacondamkii` | L |
| Beluga Liner | `belugaliner` | L |
| Caspian Explorer | `explorer_nx` | L |
| Federal Corvette | `federation_corvette` | L |
| Imperial Clipper | `empire_trader` | L |
| Imperial Cutter | `cutter` | L |
| Orca | `orca` | L |
| Panther Clipper Mk II | `panthermkii` | L |
| Type-7 Transporter | `type7` | L |
| Type-9 Heavy | `type9` | L |
| Type-10 Defender | `type9_military` | L |

Two names regularly catch people out: `cutter` is the **Imperial** Cutter (the Federal Corvette is `federation_corvette`), and `empire_trader` is the Imperial Clipper. The single source of truth in code is `src/lib/ships.ts`.

*Table sources (checked November 2026): journal names verified against real `Loadout` events and EDDI's [`ShipDefinitions.cs`](https://github.com/EDCD/EDDI/blob/develop/DataDefinitions/ShipDefinitions.cs); pad sizes cross-checked against INARA's ship list. If a mapping is wrong, please open an issue.*

## 4. Spatial Queries

Every populated system is stored with its galaxy coordinates (`x`, `y`, `z`, in light-years from Sol). A sector query for a centre `(cx, cy, cz)` and radius `r` runs in two steps:

1. **Bounding-box pre-filter (indexed):** `x BETWEEN cx-r AND cx+r`, and likewise for `y` and `z` — three cheap index range scans that discard almost the whole galaxy.
2. **Exact distance filter:** keep only rows where `√((x-cx)² + (y-cy)² + (z-cz)²) ≤ r`.

Results are cached in Redis for five minutes per `(system, radius)` key.

## 5. Reading the Journal

**Choosing the file.** A journal folder can hold hundreds of files in more than one naming scheme: current clients write `Journal.2026-11-24T123720.01.log`, the legacy 3.8 client still writes `Journal.261113225523.01.log`, and a long session rolls over into `….02.log`. Sorting by name picks the wrong file — `Journal.26…` sorts after every `Journal.20…`. The session timestamp is parsed from the name instead (both formats) and the newest wins, with a later part number breaking a tie.

**Reading it.** Only the bytes appended since the last read are read (`file.slice(offset, size)`), decoded as UTF-8 by a streaming decoder, and split on newlines. A line without a trailing newline is held back until the rest of it is written. Before a line is parsed its event name is read from the text, and anything outside the handled set (`Materials`, `NavRoute`, `Loadout.Modules`, …) is skipped unparsed, so loading a multi-megabyte session costs little.

**Keeping up.** Browsers give no notification when a file grows, so the file is polled (`src/sources/file-system-journal-source.ts`):

| Situation | File check | Folder re-scan |
|---|---|---|
| The journal was written to in the last five minutes | every 250 ms | every 10 s |
| Quiet for five minutes, or `Shutdown` seen | every 1 s | every 5 s |

A poll that finds nothing costs one metadata read. A re-scan looks for a journal newer than the one being read, which is how a new session is picked up — a restart, or a switch between the current and legacy clients. The desktop build will replace polling with a native file watcher behind the same `JournalSource` interface.

**What is kept.** The reducer (`src/lib/journal/state.ts`) folds each event into a small state: who and what (`Commander`, game mode, client version), the ship (from `Loadout`), the system (`Location`, `FSDJump`, `CarrierJump`), the station (`Docked`), cargo, and what the commander is doing (supercruise, hyperspace, on foot, in an SRV, landed). Fields that describe the player rather than the galaxy — `FID`, credits, fines, friends, chat — are never read into state, and a unit test fails if one appears.

**Demo mode.** `?demo=1` replays a made-up session (`src/sources/demo/sample-journal.ts`) through the same parser, so the dashboard can be seen, and tested, without the game.

## 6. Settings Without Accounts

There is no server-side profile. Everything a player sets is kept on their own machine:

| What | Browser build | Desktop build (planned) |
|---|---|---|
| Profiles, tweaks, pins, theme and whether it was chosen, card order, active profile | `localStorage`, key `ed-sitaware:settings`, versioned | a JSON file in the OS app-data folder |
| The journal folder they chose | `IndexedDB` holds the folder handle; access survives a restart where the browser allows it, otherwise one click re-grants it | the folder path, so it is never asked for twice |

Whatever was stored is validated before it is used (`sanitizeSettings`): broken values fall back to defaults, and built-in presets always come from the current code, so an update to a preset reaches the player. A built-in preset is never mutated — the player's tweaks sit beside it as an override until they *Save as profile*. The journal folder is remembered after a disconnect as well as after a reload, so the connect screen offers it back.

**What the journal leaves out.** A few things players expect to see are not in the file at the moment they look. At a login with the commander already docked, `Location` gives no landing-pad counts, and for a fleet carrier no distance from the star either; both arrive with the next `Docked` event (185 of 185 real carrier dockings carry the distance). An uninhabited system has no `Factions` at all. The cards say this in words rather than showing a blank. The engine also reads `GameModeChange`, which follows `LoadGame` in a real session.

## 7. Project Layout

```text
src/
├── app/            Next.js App Router shell: layout (fonts, theme script), page, design tokens
├── components/     The cockpit UI: control bar, telemetry strip, cards, drawer, connect flow
├── hooks/
├── lib/
│   ├── card-order.ts  The order of the cards, and how it is stored and reset
│   ├── os.ts       Where each operating system keeps the journal folder
│   ├── theme.ts    Light and dark, the three colours, and the system setting
│   ├── ships.ts    The ship → pad table and name matching
│   ├── journal/    Pure journal logic: file names, line parsing, the state reducer, hazards
│   ├── fsa/        File System Access helpers: the folder picker and the remembered folder
│   ├── profiles.ts Profiles, presets, pad filters, profile import and export
│   └── widgets.ts  The widget catalogue
├── sources/        Journal sources: the folder watcher, the demo replay, the controller
└── store/          Zustand stores: persisted settings; live commander state
```
