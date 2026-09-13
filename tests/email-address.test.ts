import { afterEach, describe, expect, it, vi } from "vitest";
import { assertDeliverableEmail, isValidEmailSyntax, normalizeEmail } from "@/lib/email/address";
import { ServiceError } from "@/services/types";

/** A canned Resend /suppressions/{email} response for one test. tests/
 *  setup.ts's global fetch stub already returns 404 by default — this
 *  overrides it once, for the next matching call only. */
function mockSuppressionResponse(status: number, body: unknown = null) {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(body === null ? null : JSON.stringify(body), { status }),
  );
}

describe("isValidEmailSyntax", () => {
  it("accepts ordinary work addresses", () => {
    for (const ok of [
      "aung@example.com",
      "aung.aung@sub.example.co.uk",
      "a+tag@example.io",
      "AUNG@EXAMPLE.COM",
    ]) {
      expect(isValidEmailSyntax(ok)).toBe(true);
    }
  });

  it("rejects malformed values", () => {
    for (const bad of [
      "",
      "aung",
      "aung@",
      "@example.com",
      "aung@@example.com",
      "aung@example",
      "aung example@x.com",
      "aung@example..com",
      "aung@-example.com",
      `${"a".repeat(65)}@example.com`,
    ]) {
      expect(isValidEmailSyntax(bad)).toBe(false);
    }
  });
});

describe("normalizeEmail", () => {
  it("trims and lower-cases", () => {
    expect(normalizeEmail("  Aung@Example.COM ")).toBe("aung@example.com");
  });
});

describe("assertDeliverableEmail", () => {
  it("passes for a domain that actually receives mail", async () => {
    await expect(assertDeliverableEmail("test@gmail.com")).resolves.toBeUndefined();
  });

  it("rejects a domain with no mail exchanger", async () => {
    // `.invalid` is reserved by RFC 6761 to never resolve.
    await expect(assertDeliverableEmail("someone@nonexistent.invalid")).rejects.toBeInstanceOf(
      ServiceError,
    );
  });

  it("rejects a disposable-inbox provider", async () => {
    await expect(assertDeliverableEmail("burner@mailinator.com")).rejects.toBeInstanceOf(
      ServiceError,
    );
  });

  it("rejects malformed syntax before any lookup", async () => {
    await expect(assertDeliverableEmail("not-an-email")).rejects.toBeInstanceOf(ServiceError);
  });
});

// isKnownToBounce isn't exported — exercised only through
// assertDeliverableEmail, which is how every real caller reaches it too.
// The global fetch stub (tests/setup.ts) already answers "not suppressed"
// by default; these override it per-case for the branches that matters.
describe("assertDeliverableEmail — Resend suppression check", () => {
  afterEach(() => {
    vi.mocked(fetch).mockClear();
  });

  it("rejects an address Resend has already flagged undeliverable", async () => {
    mockSuppressionResponse(200, {
      object: "suppression",
      id: "e169aa45-1ecf-4183-9955-b1499d5701d3",
      email: "bounced@gmail.com",
      origin: "bounce",
      created_at: "2026-01-01 00:00:00+00",
    });
    await expect(assertDeliverableEmail("bounced@gmail.com")).rejects.toBeInstanceOf(
      ServiceError,
    );
  });

  it("passes an address Resend has never seen (404)", async () => {
    mockSuppressionResponse(404);
    await expect(assertDeliverableEmail("clean@gmail.com")).resolves.toBeUndefined();
  });

  it("doesn't block on a misconfigured key (401) — that's a setup problem, not the address's fault", async () => {
    mockSuppressionResponse(401, { message: "This API key is restricted to only send emails" });
    await expect(assertDeliverableEmail("test@gmail.com")).resolves.toBeUndefined();
  });

  it("fails closed when Resend itself errors (5xx)", async () => {
    mockSuppressionResponse(500);
    await expect(assertDeliverableEmail("test@gmail.com")).rejects.toBeInstanceOf(ServiceError);
  });

  it("skips the check entirely with no RESEND_API_KEY configured", async () => {
    const original = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    try {
      // No mock queued — if this reached fetch at all, the base stub's
      // default 404 would still pass, so passing alone doesn't prove the
      // skip happened. Asserting zero calls is what actually does.
      await expect(assertDeliverableEmail("test@gmail.com")).resolves.toBeUndefined();
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      if (original !== undefined) process.env.RESEND_API_KEY = original;
    }
  });
});
