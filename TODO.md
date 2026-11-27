# TODO

The working list of what is left. The [PRD](./PRD.md) says *why* each thing exists; this list says *whether it exists yet*. To pitch something new, open an Issue or a Discussion — see [CONTRIBUTING.md](./CONTRIBUTING.md).

**Now** is being worked on. **Next** is the rest of the MVP. **Later** is post-MVP. An item is ticked when it is on `main`.

## Now

- [ ] Watch a real game session end to end in Chrome or Edge. Everything up to the folder picker is tested; the picker itself is a native dialog that only a person can click through.

## Next — finish the MVP

### Sector feed
The backend that knows every port within the radius (ARCHITECTURE §4).
- [ ] PostgreSQL schema for systems, stations and bodies, fed by Spansh's nightly `galaxy_populated.json.gz`.
- [ ] `/api/sector`: bounding-box pre-filter plus exact distance, cached in Redis.
- [ ] Data age: record when each station's prices and services were last confirmed, for the badges (`< 2 h`, `< 24 h`, `> 24 h`).

### Widgets that need the feed
Their cards exist already and show the search each will run.
- [ ] Nearest ports & services.
- [ ] Material traders: raw, manufactured and encoded.
- [ ] Interstellar factors and tech brokers.
- [ ] Local market snapshot: top exports and imports, and bulk supply for colonisation.
- [ ] Mining rings & reserves.
- [ ] HazRES & conflict zones.

### Give back to the community
- [ ] Opt-in EDDN uploader: whitelisted events only, the mandated elisions, `gameversion` and `gamebuild` headers, and proven against the `/test` schemas before anything reaches the live ones (ARCHITECTURE §2).

### Sharper gotchas
- [ ] High-G worlds (`> 1.5 G`) at planetary ports; needs the body's surface gravity.
- [ ] Read `Status.json` for docked, supercruise and on-foot flags, which it reports sooner than the journal.

## Later — post-MVP

- [ ] **In-game overlay window.** A small, minimal window that sits on top of the game and shows only what matters this second — the point of the name SitAware.
  - [ ] Switched on from the app with one checkbox.
  - [ ] The app decides what it shows, widget by widget.
  - [ ] Its opacity is set from the app.
  - [ ] Updates live as the commander jumps, docks and flies into trouble.
  - [ ] Glanceable mid-flight: a few lines at most.
  - [ ] Never takes input away from the game.
- [ ] **Desktop app** (`.exe`, Linux): the same UI in Tauri, with a native file watcher instead of polling, a system tray, and no installer questions.
- [ ] **Find the journal folder for the player.** A browser cannot look for it silently. The desktop build reads the system's own Saved Games location; the browser build could offer sign-in with Frontier's Companion API as a way to skip the folder altogether.
- [ ] Live EDDN firehose listener: prices and station states within seconds of any commander docking.
- [ ] Powerplay 2.0 roadmap and simplified companion.
- [ ] Colonisation and Powerplay synergy planner.
- [ ] Massacre mission stacking detector.
- [ ] Phone and tablet companion over the local network.

## Housekeeping

- [ ] Branch protection on `main`, once there is more than one regular contributor.
- [ ] Automated accessibility and visual checks (needs Playwright).
- [ ] Show the measured journal-to-screen latency in the customise drawer.

## Done

- [x] Live journal watch in the browser (Chrome, Edge), including the legacy client's file names.
- [x] Commander telemetry, current system and current station.
- [x] Gotcha alerts: long approaches, planetary ports, Lockdown and infrastructure failure.
- [x] Global controls: radius, supercruise limit, pad filter, fleet carriers, profile.
- [x] Checkbox everything: presets, tweaks, custom profiles, pins, import and export.
- [x] Settings kept on the player's machine, with no account.
- [x] Four themes: Amber, Cyan, Slate, Light.
- [x] Finding the journal folder: a copyable path, steps for the picker, and drag and drop.
- [x] CI: type-check, lint, test and build.
