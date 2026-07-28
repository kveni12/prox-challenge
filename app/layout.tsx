import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Public_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const bodyFont = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const dataFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-data",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vulcan OmniPro 220 Welding Assistant",
  description:
    "An expert operating companion for the Vulcan OmniPro 220 multiprocess welder — grounded answers on polarity, duty cycle, process selection, and troubleshooting, straight from the owner's manual.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ee" },
    { media: "(prefers-color-scheme: dark)", color: "#121009" },
  ],
};

// Runs before paint (blocking, inline) so the correct theme is applied on
// first frame — no flash of the wrong theme. Falls back to system
// preference when the user hasn't picked one explicitly.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("vulcan-theme");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${headingFont.variable} ${bodyFont.variable} ${dataFont.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
