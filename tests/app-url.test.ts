import { afterEach, describe, expect, it } from "vitest";
import { appBaseURL } from "@/lib/app-url";

// The regression this guards: VERCEL_PROJECT_PRODUCTION_URL is set on
// *every* Vercel environment, not just Production — it's "the production
// domain," not "this deployment's domain." Preferring it unconditionally
// sent every link built on a Preview deployment (invitation emails,
// password resets) to production instead of back to the Preview deployment
// that built them. See docs/adr's email ADR and src/lib/auth/config.ts's
// resolveBaseURL, which mirrors this exact resolution.
const VERCEL_KEYS = [
  "APP_BASE_URL",
  "BETTER_AUTH_URL",
  "VERCEL_ENV",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_BRANCH_URL",
  "VERCEL_URL",
] as const;

function withEnv(vars: Partial<Record<(typeof VERCEL_KEYS)[number], string>>) {
  for (const key of VERCEL_KEYS) {
    if (key in vars) process.env[key] = vars[key];
    else delete process.env[key];
  }
}

describe("appBaseURL", () => {
  afterEach(() => {
    for (const key of VERCEL_KEYS) delete process.env[key];
  });

  it("prefers an explicit APP_BASE_URL over everything else", () => {
    withEnv({
      APP_BASE_URL: "https://custom.example.com/",
      VERCEL_ENV: "preview",
      VERCEL_PROJECT_PRODUCTION_URL: "suseeos.com",
    });
    expect(appBaseURL()).toBe("https://custom.example.com");
  });

  it("falls back to BETTER_AUTH_URL when APP_BASE_URL is unset", () => {
    withEnv({ BETTER_AUTH_URL: "https://fallback.example.com" });
    expect(appBaseURL()).toBe("https://fallback.example.com");
  });

  it("on Production, uses the production domain", () => {
    withEnv({
      VERCEL_ENV: "production",
      VERCEL_PROJECT_PRODUCTION_URL: "suseeos.com",
      VERCEL_URL: "suseeos-abc123.vercel.app",
    });
    expect(appBaseURL()).toBe("https://suseeos.com");
  });

  it("on Preview, does NOT resolve to the production domain", () => {
    withEnv({
      VERCEL_ENV: "preview",
      // Present, as it always is on Vercel — must not win here.
      VERCEL_PROJECT_PRODUCTION_URL: "suseeos.com",
      VERCEL_BRANCH_URL: "suseeos-git-dev-nevergrass.vercel.app",
      VERCEL_URL: "suseeos-abc123.vercel.app",
    });
    expect(appBaseURL()).toBe("https://suseeos-git-dev-nevergrass.vercel.app");
  });

  it("on Preview without a branch URL, falls back to the per-deployment URL", () => {
    withEnv({
      VERCEL_ENV: "preview",
      VERCEL_PROJECT_PRODUCTION_URL: "suseeos.com",
      VERCEL_URL: "suseeos-abc123.vercel.app",
    });
    expect(appBaseURL()).toBe("https://suseeos-abc123.vercel.app");
  });

  it("falls back to localhost off Vercel entirely", () => {
    withEnv({});
    expect(appBaseURL()).toBe("http://localhost:3000");
  });
});
