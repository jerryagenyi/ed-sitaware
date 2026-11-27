const REPO = "https://github.com/jerryagenyi/ed-sitaware";

// Fixed at build time, so server and browser always agree on it.
const YEAR = new Date().getFullYear();

const LINKS: readonly { label: string; href: string }[] = [
  { label: "GitHub", href: REPO },
  { label: "Contribute", href: `${REPO}/blob/main/CONTRIBUTING.md` },
  { label: "Report a bug", href: `${REPO}/issues` },
  { label: "Roadmap", href: `${REPO}/blob/main/TODO.md` },
  { label: "References", href: `${REPO}/blob/main/REFERENCES.md` },
];

/** Copyright, licence and the way back to the project. */
export function Footer() {
  return (
    <footer className="footer border-t border-line px-6 py-5 text-caption text-muted">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
          <p>
            <span className="font-medium tracking-[0.08em] text-fg uppercase">ED:SitAware</span>
            {" · © "}
            <span suppressHydrationWarning>{YEAR}</span>
            {" Jerry Agenyi · "}
            <a href={`${REPO}/blob/main/LICENSE`}>MIT licence</a>
          </p>
          <nav aria-label="Project">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="max-w-[90ch]">
          Your journal stays on this device and there is no account. Elite Dangerous is a trademark of Frontier
          Developments plc; this project is not affiliated with Frontier Developments.
        </p>
      </div>
    </footer>
  );
}
