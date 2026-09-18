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
  // without Safari's own chrome (the actual "PWA" part on iOS).
  appleWebApp: {
    capable: true,
    title: "SuSeeOS",
    statusBarStyle: "black-translucent",
  },
  // Explicit `icons` (rather than the app/icon.png + app/apple-icon.png file
  // convention, which only ever emits one static tag each) because iOS 18+
  // and modern browser tab favicons both support alternate icon appearances
  // via a `media` query per <link> — the one real, cross-platform way to
  // have the *installed app's* icon itself follow system light/dark mode,
  // not just the in-app UI. Dark listed first: an iOS/browser version old
  // enough to ignore `media` entirely just takes the first tag, which
  // should be the one matching this app's own default theme.
  //
  // Android has no equivalent — the Web Manifest spec's `icons` array (see
  // manifest.ts) has no `media` field, and no mainstream browser supports
  // swapping a PWA's home-screen icon by system theme — so that one stays a
  // single fixed (dark) icon regardless of the device's theme.
  icons: {
    icon: [
      { url: "/apple-icon-dark.png", media: "(prefers-color-scheme: dark)" },
      { url: "/apple-icon-light.png", media: "(prefers-color-scheme: light)" },
    ],
    apple: [
      { url: "/apple-icon-dark.png", media: "(prefers-color-scheme: dark)" },
      { url: "/apple-icon-light.png", media: "(prefers-color-scheme: light)" },
    ],
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
        {/* Chrome can fire `beforeinstallprompt` before React ever hydrates —
            a cold load has to download/parse/hydrate the whole bundle first,
            and on a slow connection that's easily enough time for the event
            to come and go. A listener added inside a React effect
            (install-prompt-listener.tsx) attaches too late to call
            preventDefault() on that firing, so Chrome falls back to its own
            automatic mini-infobar instead — which is what showed up on
            /login specifically: the very first page of the session, and
            the one most likely to still be mid-hydration when Chrome
            decides the criteria are met. This plain, blocking script runs
            during HTML parsing, before any JS bundle, so it's already
            listening by the time the event could possibly fire — same
            "beat hydration" trick as the theme script above.
            install-prompt.ts's getInstallPrompt() reads window.__pwaInstall
            first, falling back to its own React-side capture. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'window.__pwaInstall=null;window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__pwaInstall=e;});',
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
