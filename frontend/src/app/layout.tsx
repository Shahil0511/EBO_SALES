import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";

import "./globals.css";

// Body sans. Maps to --font-sans / Tailwind `font-sans` (the default).
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

// Display serif for headings/KPIs. Maps to --font-fraunces / Tailwind `font-heading`.
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });

// Monospace for codes / numbers. Maps to --font-plex-mono / Tailwind `font-mono`.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LIBAS · Sales Intelligence",
  description: "Retail sales analytics for Libas EBO stores.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">{children}</body>
    </html>
  );
}
