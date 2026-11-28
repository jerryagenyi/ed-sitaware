import type { Metadata } from "next";
import { Chakra_Petch, JetBrains_Mono } from "next/font/google";
import { DEFAULT_THEME_ID, SETTINGS_STORAGE_KEY, THEMES } from "@/lib/storage-keys";
import "./globals.css";

// Faces are self-hosted at build time: the browser never asks Google for anything.
const chakra = Chakra_Petch({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-chakra",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "ED:SitAware", template: "%s · ED:SitAware" },
  description:
    "Zero-click tactical radar for Elite Dangerous. Reads your journal live and briefs you on the ports, services and hazards around you.",
  applicationName: "ED:SitAware",
};

// Applies the theme while the document is still being parsed, so the page never
// flashes the wrong one first: the player's own choice if they have made one, and
// until then whatever light or dark setting the system itself asks for.
const themeScript = `(function(){try{var d=document.documentElement,t=null,s=JSON.parse(localStorage.getItem(${JSON.stringify(
  SETTINGS_STORAGE_KEY,
)})||"null");t=s&&s.state&&s.state.theme;if(${JSON.stringify(
  THEMES,
)}.indexOf(t)>-1){d.setAttribute("data-theme",t);return}if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches){d.setAttribute("data-theme","light")}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-GB"
      data-theme={DEFAULT_THEME_ID}
      data-zcode-design=""
      suppressHydrationWarning
      className={`${chakra.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
