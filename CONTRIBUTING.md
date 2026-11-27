# Contributing to ED:SitAware

Welcome, Commander! `ED:SitAware` is a free, community-driven open-source tool built for the love of *Elite Dangerous*. Whether you are a seasoned TypeScript/Rust developer, a UX designer, or a veteran CMDR with domain knowledge, contributions are warmly welcomed.

## Ways to Contribute
* **Report Bugs or "Gotchas":** Open an Issue if a ship pad size is mapped incorrectly, a journal event fails to parse, or a UI layout breaks on your screen resolution.
* **Suggest Widgets or Role Presets:** Have an idea for a new tactical widget or a better default profile? Open an Issue or Discussion to pitch it.
* **Submit Pull Requests:** Pick an open issue (or propose a small improvement) and open a PR.

## Development
You need Node 22 or later (see `.nvmrc`).

```bash
npm install
npm run dev        # http://localhost:3000 — add ?demo=1 to play a sample session
npm run check      # type-check, lint, tests and a production build: what CI runs
```

Please run `npm run check` before opening a pull request. `ARCHITECTURE.md` explains where things live and why; §7 is the map.

## Pull Request Workflow
1. **Fork** the repository and create a new branch from `main` (e.g., `feat/powerplay-widget` or `fix/type7-pad-size`).
2. **Keep changes focused:** Small, single-purpose PRs are much easier to review and merge quickly.
3. **Follow EDDN Rules:** Any change touching EDDN uploads **must** comply with the [live EDDN developer documentation](https://github.com/EDCD/EDDN/blob/live/docs/Developers.md): send only the journal events EDDN whitelists, apply every required elision (no Commander-specific fields such as `FID`, `Wanted` or `ActiveFine`, and no `_Localised` keys), validate against the live `EDCD/EDDN` schemas, and never send test data to the live schemas — append `/test` to the `$schemaRef` instead.
4. **Match the house style:** British English spelling in documentation and UI copy.
5. **Open a Pull Request** describing what your change does and how you tested it.

## Code of Conduct
Be respectful, constructive, and helpful—just like the Fuel Rats and Hull Seals. Fly safe! o7
