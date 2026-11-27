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

* **Frontend:** Next.js 15 (App Router, TypeScript) + Tailwind CSS + Zustand (state management).
* **Desktop Packaging:** **Tauri v2** (compiles the frontend into a lightweight Windows `.exe` / Linux binary with native filesystem watching and system tray support).
* **Backend & Spatial DB:** Node.js + **PostgreSQL** (indexed 3D `x`, `y`, `z` star coordinates) + **Redis** (5-minute cache for sector queries).
* **EDDN Integration:**
  * **Outbound (Client):** Validated JSON POSTs to `https://eddn.edcd.io:4430/upload/` with `uploaderID` anonymised (hashed Commander name — the EDDN relay obfuscates it again on receipt), `softwareName: "ED:SitAware"`, a semantic `softwareVersion` (bumped whenever the content of our messages changes), and `gameversion` / `gamebuild` taken from the journal's `Fileheader` event. The gateway enables CORS, so the browser client can upload directly without a proxy. Rules enforced upstream, per the [live EDDN developer documentation](https://github.com/EDCD/EDDN/blob/live/docs/Developers.md):
    * HTTP/1.1 over TLS, `Content-Type: application/json`, body no larger than 1 MiB.
    * Only whitelisted journal events may be sent (`Docked`, `FSDJump`, `Location`, `CarrierJump`, `Scan`, `SAASignalsFound`, `CodexEntry`), with every mandated elision applied — no Commander-specific fields, no `_Localised` keys.
    * Never retry a `400` or `426`; wait at least one minute before retrying anything else.
    * While developing or testing, append `/test` to the `$schemaRef` — never send non-live data to the live schemas.
  * **Inbound (Server — Phase 2):** Python/Node worker subscribing to `tcp://eddn.edcd.io:9500` via `zeromq` (subscribe to the empty topic `''`; each message is zlib-compressed JSON) to update markets and station states live.

## 3. Ship Pad Size Mapping (Auto-Detection)

When the parser reads a `Loadout` event from `Journal.*.log`, its `Ship` field carries the ship's symbolic name (for example `Krait_MkII`). That name maps to the smallest landing pad the ship can dock on, which drives the *Auto from Ship* pad filter:

* **Match on a normalised name.** Lowercase the value and strip `_`, `.` and spaces before lookup — the journal's naming is not consistent across events or game versions (`CobraMkIII` in `Loadout`, `cobramkiii` in `SetUserShipName`, bare lowercase `type8`), so never rely on exact spelling or casing.
* **Unmapped ships are treated as Large.** When Frontier adds a ship, its name will not be in the table until we add it. Defaulting to Large fails safe: the worst case is a temporarily over-filtered port list, never a large ship sent to a Medium-only outpost. The UI flags an unmapped ship so it can be reported.
* **Players can always override.** The pad filter offers `Any` / `Medium+` / `Large Only` alongside `Auto from Ship`.

| Ship | `Loadout.Ship` | Pad |
|---|---|---|
| Adder | `Adder` | S |
| Cobra Mk III | `CobraMkIII` | S |
| Cobra Mk IV | `CobraMkIV` | S |
| Cobra Mk V | `CobraMkV` | S |
| Diamondback Explorer | `DiamondbackXL` | S |
| Diamondback Scout | `Diamondback` | S |
| Dolphin | `Dolphin` | S |
| Eagle | `Eagle` | S |
| Hauler | `Hauler` | S |
| Imperial Courier | `Empire_Courier` | S |
| Imperial Eagle | `Empire_Eagle` | S |
| Kestrel Mk II | `smallcombat01_nx` | S |
| Sidewinder | `Sidewinder` | S |
| Viper Mk III | `Viper` | S |
| Viper Mk IV | `Viper_MkIV` | S |
| Vulture | `Vulture` | S |
| Alliance Challenger | `TypeX_3` | M |
| Alliance Chieftain | `TypeX` | M |
| Alliance Crusader | `TypeX_2` | M |
| Asp Explorer | `Asp` | M |
| Asp Scout | `Asp_Scout` | M |
| Corsair | `Corsair` | M |
| Federal Assault Ship | `Federation_Dropship_MkII` | M |
| Federal Dropship | `Federation_Dropship` | M |
| Federal Gunship | `Federation_Gunship` | M |
| Fer-de-Lance | `FerDeLance` | M |
| Keelback | `Independant_Trader` | M |
| Krait Mk II | `Krait_MkII` | M |
| Krait Phantom | `Krait_Light` | M |
| Lynx Highliner | `mediumtransport01` | M |
| Mamba | `Mamba` | M |
| Mandalay | `mandalay` | M |
| Python | `Python` | M |
| Python Mk II | `Python_NX` | M |
| Type-6 Transporter | `Type6` | M |
| Type-8 Transporter | `type8` | M |
| Type-11 Prospector | `LakonMiner` | M |
| Anaconda | `Anaconda` | L |
| Anaconda Mk II | `AnacondaMkII` | L |
| Beluga Liner | `BelugaLiner` | L |
| Caspian Explorer | `explorer_nx` | L |
| Federal Corvette | `Federation_Corvette` | L |
| Imperial Clipper | `Empire_Trader` | L |
| Imperial Cutter | `Cutter` | L |
| Orca | `Orca` | L |
| Panther Clipper Mk II | `PantherMkII` | L |
| Type-7 Transporter | `Type7` | L |
| Type-9 Heavy | `Type9` | L |
| Type-10 Defender | `Type9_Military` | L |

Two names regularly catch people out: in journal naming `Cutter` is the **Imperial** Cutter (the Federal Corvette is `Federation_Corvette`), and `Empire_Trader` is the Imperial Clipper.

*Table sources (checked November 2026): journal names and pad sizes from EDDI's [`ShipDefinitions.cs`](https://github.com/EDCD/EDDI/blob/develop/DataDefinitions/ShipDefinitions.cs), cross-checked against INARA's ship list. If a mapping is wrong, please open an issue.*

## 4. Spatial Queries

Every populated system is stored with its galaxy coordinates (`x`, `y`, `z`, in light-years from Sol). A sector query for a centre `(cx, cy, cz)` and radius `r` runs in two steps:

1. **Bounding-box pre-filter (indexed):** `x BETWEEN cx-r AND cx+r`, and likewise for `y` and `z` — three cheap index range scans that discard almost the whole galaxy.
2. **Exact distance filter:** keep only rows where `√((x-cx)² + (y-cy)² + (z-cz)²) ≤ r`.

Results are cached in Redis for five minutes per `(system, radius)` key.
