import { vi } from "vitest";
import { config as loadEnv } from "dotenv";

// Vitest doesn't get Next's automatic .env.local loading.
loadEnv({ path: ".env.local" });

// src/lib/email/send.ts has no test/dev gate — it calls the real Resend API
// whenever RESEND_API_KEY is set, full stop. Invitation flows go through it
// on every accept/invite exercised here (tests/invitations.test.ts alone
// fires it ~9 times a run), so left unmocked, every test run burns real
// send quota against fake `*@invite.test` addresses. Mock the module once,
// globally, so nothing under tests/ ever reaches the network. Manual/browser
// testing remains the only path that actually sends mail.
vi.mock("@/lib/email/send", () => ({
  sendInvitationEmail: vi.fn(async () => {}),
  sendCredentialsEmail: vi.fn(async () => {}),
}));

// src/lib/email/address.ts's isKnownToBounce() makes its own raw fetch() to
// Resend's suppression-check endpoint — a *read*, not a send, but still a
// real call to Resend's API, and every existing assertDeliverableEmail
// caller in these tests (customers, invitations, platform, staff) would
// otherwise make one on every run. Stub fetch itself so nothing under
// tests/ ever reaches Resend at all, read or write. Default: "not
// suppressed" (404), what every caller here expects; anything that isn't
// Resend's suppression endpoint falls through to the real fetch.
// tests/email-address.test.ts overrides this per-case (vi.mocked(fetch))
// to exercise the suppressed/misconfigured/error branches directly.
const realFetch = globalThis.fetch;
vi.stubGlobal(
  "fetch",
  vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith("https://api.resend.com/suppressions/")) {
      return Promise.resolve(new Response(null, { status: 404 }));
    }
    return realFetch(input, init);
  }),
);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — tests need a real database. See .env.example");
}

// Guard against the failure mode that would make the whole suite meaningless:
// RLS does not apply to a table's owner, so running these as `neondb_owner`
// would let every isolation assertion pass while proving nothing.
if (/neondb_owner/.test(process.env.DATABASE_URL)) {
  throw new Error(
    "DATABASE_URL points at neondb_owner. RLS is not enforced for the owner role, " +
      "so the isolation tests would pass vacuously. Point it at app_user.",
  );
}
