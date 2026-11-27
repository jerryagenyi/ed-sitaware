import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ED:SitAware",
  description: "Zero-click tactical radar for Elite Dangerous.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
