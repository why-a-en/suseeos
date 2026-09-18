import type { Metadata, Viewport } from "next";
import { Public_Sans, Martian_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { InstallPromptListener } from "@/components/install-prompt-listener";
import "./globals.css";

// The design system's two faces (see src/styles/tokens/typography.css):
// Public Sans for display/UI/metric text, Martian Mono for micro-labels and
// codes. Loaded via next/font rather than the source project's Google Fonts
// CSS @import for self-hosting + no render-blocking network request.
const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: "variable",
});

const martianMono = Martian_Mono({
  variable: "--font-martian-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SuSeeOS",
  description: "Product catalog and daily order coordination for Support Agents and Suppliers.",
  // iOS Safari never reads manifest.ts for install behaviour — it wants its
  // own meta tags. `capable` is what makes "Add to Home Screen" launch
  // without Safari's own chrome (the actual "PWA" part on iOS); apple-icon.png
  // (file convention, this same directory) supplies the home-screen icon,
  // since iOS also ignores the manifest's `icons` array.
  appleWebApp: {
    capable: true,
    title: "SuSeeOS",
    statusBarStyle: "black-translucent",
  },
};

// Matches dark --surface-page (tokens/colors.css), computed via the
// OKLCH→sRGB matrices since the token has no precomputed hex — this is what
// the OS chrome (status bar, splash background) paints. Dark is the
// server-rendered default; deliberately a single flat string rather than a
// `media: "(prefers-color-scheme: ...)"` pair, because that media query
// tracks the *system's* preference, not this app's own explicit light/dark
// override (localStorage, independent of the OS setting) — the blocking
// script below and theme-toggle.tsx's apply() both update this tag's
// content directly instead, so it stays correct for whichever theme the app
// is actually rendering.
export const viewport: Viewport = {
  themeColor: "#12110f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${martianMono.variable} h-full antialiased`}
    >
      <head>
        {/* Dark is the token system's default (no attribute needed); this only
            has work to do when the viewer previously chose light — applied
            before paint so there's no flash back to dark on load. See
            components/ui/theme-toggle.tsx, which owns writing the choice.
            Also flips the theme-color meta tag (viewport export above) to
            the light surface hex, same reason: that tag has to match
            whichever theme actually renders, not the OS's own preference. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("theme");if(t==="light"){document.documentElement.setAttribute("data-theme","light");var m=document.querySelector(\'meta[name="theme-color"]\');if(m)m.setAttribute("content","#f2f1ee");}}catch(e){}',
          }}
        />
      </head>
      {/* h-full (a definite height, not just a minimum) matters here: every
          screen's scroll region (Screen/ScrollBody, see
          components/ui/screen.tsx) is built as a flex:1 + min-height:0
          chain that only clips and scrolls internally when every ancestor up
          to the viewport has an actual bounded height to divide up. `body`
          previously used min-h-full (min-height:100%, no upper bound), which
          let it grow past the viewport to fit content instead of handing
          overflow to ScrollBody's own overflow-y:auto — the designated
          scroll region silently stopped scrolling (nothing to clip against),
          and only the page itself could ever reach the rest, which several
          real devices' touch scrolling didn't reliably do either. */}
      <body className="h-full flex flex-col overflow-x-hidden">
        <InstallPromptListener />
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  );
}
