import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, invitations, organizations, users } from "@/db/schema";
import {
  cancelPlatformInvitation,
  createStore,
  getStoreDetail,
  resendPlatformInvitation,
  resetOperatorPassword,
} from "@/services/platform";
import { ServiceError } from "@/services/types";
import { auth } from "@/lib/auth/config";
import { isPlatformAdmin, PLATFORM_ADMIN_ROLE } from "@/lib/auth/platform-admins";
import { verifyPassword } from "@/lib/auth/hash";

// Phase 4 of docs/plans/store-as-tenant.md: pending-invite management for
// the operator console. createStore/getStoreDetail's own coverage predates
// this file — this is just the new resend/cancel surface, direct DB writes
// rather than through the org plugin for the same reason createStore itself
// is (a Platform Admin has no membership anywhere to run
// auth.api.createInvitation/cancelInvitation against).

const TAG = `platform-${Date.now()}`;

let operatorId: string;
const storeIds: string[] = [];

beforeAll(async () => {
  const [operator] = await db
    .insert(users)
    .values({ name: `${TAG} operator`, email: `${TAG}-operator@platform.test` })
    .returning({ id: users.id });
  operatorId = operator.id;
});

afterAll(async () => {
  if (storeIds.length > 0) {
    await db.delete(invitations).where(inArray(invitations.organizationId, storeIds));
    await db.delete(organizations).where(inArray(organizations.id, storeIds));
  }
  await db.delete(users).where(eq(users.id, operatorId));
});

async function freshStore(label: string) {
  const created = await createStore({
    storeName: `${TAG}-${label}`,
    adminEmail: `${TAG}-${label}-admin@platform.test`,
    invitedById: operatorId,
  });
  storeIds.push(created.storeId);
  return created;
}

describe("getStoreDetail", () => {
  it("lists the invitation createStore just issued as pending", async () => {
    const created = await freshStore("detail");
    const detail = await getStoreDetail(created.storeId);
    expect(detail!.pendingInvitations).toHaveLength(1);
    expect(detail!.pendingInvitations[0]).toMatchObject({
      id: created.invitationId,
      email: created.adminEmail,
      role: "admin",
    });
  });
});

describe("resendPlatformInvitation", () => {
  it("cancels the old row and issues a fresh one for the same address", async () => {
    const created = await freshStore("resend");

    const resent = await resendPlatformInvitation(created.invitationId, operatorId);
    expect(resent.email).toBe(created.adminEmail);
    expect(resent.invitationId).not.toBe(created.invitationId);

    const [old] = await db.select().from(invitations).where(eq(invitations.id, created.invitationId));
    expect(old.status).toBe("cancelled");

    const [fresh] = await db.select().from(invitations).where(eq(invitations.id, resent.invitationId));
    expect(fresh.status).toBe("pending");
    expect(fresh.email).toBe(created.adminEmail);
    expect(fresh.organizationId).toBe(created.storeId);

    const detail = await getStoreDetail(created.storeId);
    expect(detail!.pendingInvitations.map((i) => i.id)).toEqual([resent.invitationId]);
  });

  it("refuses to resend one that's already been cancelled", async () => {
    const created = await freshStore("resend-twice");
    await resendPlatformInvitation(created.invitationId, operatorId);

    await expect(resendPlatformInvitation(created.invitationId, operatorId)).rejects.toThrow(
      ServiceError,
    );
  });
});

describe("cancelPlatformInvitation", () => {
  it("marks a pending invitation cancelled", async () => {
    const created = await freshStore("cancel");

    await cancelPlatformInvitation(created.invitationId);

    const [row] = await db.select().from(invitations).where(eq(invitations.id, created.invitationId));
    expect(row.status).toBe("cancelled");

    const detail = await getStoreDetail(created.storeId);
    expect(detail!.pendingInvitations).toHaveLength(0);
  });

  it("is a no-op against an invitation that isn't pending", async () => {
    const created = await freshStore("cancel-twice");
    await cancelPlatformInvitation(created.invitationId);

    // No throw — cancelling something already cancelled just does nothing.
    await expect(cancelPlatformInvitation(created.invitationId)).resolves.toBeUndefined();
  });
});

// ADR-0007: users.role = PLATFORM_ADMIN_ROLE replaces PLATFORM_ADMIN_USER_IDS.
describe("isPlatformAdmin", () => {
  it("is true only for the exact platform-admin role value", () => {
    expect(isPlatformAdmin(PLATFORM_ADMIN_ROLE)).toBe(true);
  });

  it("is false for every other role, including nullish and near-miss values", () => {
    expect(isPlatformAdmin("admin")).toBe(false); // members.role's "admin" — a different axis entirely
    expect(isPlatformAdmin("user")).toBe(false); // the admin plugin's own default role
    expect(isPlatformAdmin(null)).toBe(false);
    expect(isPlatformAdmin(undefined)).toBe(false);
    expect(isPlatformAdmin("")).toBe(false);
  });
});

describe("resetOperatorPassword", () => {
  const opTag = `platform-reset-${Date.now()}`;
  const opEmail = `${opTag}@platform.test`;
  let realOperatorId: string;
  let plainUserId: string;

  beforeAll(async () => {
    // A real operator: through better-auth so it has an actual credential
    // account, the same way scripts/add-platform-admin.mts creates one.
    await auth.api.signUpEmail({ body: { email: opEmail, password: "original-password-123", name: "Reset Target" } });
    const [op] = await db
      .update(users)
      .set({ role: PLATFORM_ADMIN_ROLE })
      .where(eq(users.email, opEmail))
      .returning({ id: users.id });
    realOperatorId = op.id;

    // An ordinary (non-operator) user, to prove the target-must-be-an-
    // operator guard actually guards something.
    const [plain] = await db
      .insert(users)
      .values({ name: `${opTag} plain`, email: `${opTag}-plain@platform.test` })
      .returning({ id: users.id });
    plainUserId = plain.id;
  });

  afterAll(async () => {
    await db.delete(users).where(inArray(users.id, [realOperatorId, plainUserId]));
  });

  it("generates a new password, hashes it, and forces replacement on next sign-in", async () => {
    const result = await resetOperatorPassword(realOperatorId);
    expect(result.email).toBe(opEmail);

    const [account] = await db
      .select({ password: accounts.password })
      .from(accounts)
      .where(and(eq(accounts.userId, realOperatorId), eq(accounts.providerId, "credential")));
    // The new password actually verifies against the stored hash — not
    // just "some hash changed", but the exact one returned to the caller.
    expect(await verifyPassword(account.password!, result.temporaryPassword)).toBe(true);
    // And the old one no longer does.
    expect(await verifyPassword(account.password!, "original-password-123")).toBe(false);

    const [user] = await db
      .select({ mustChangePassword: users.mustChangePassword })
      .from(users)
      .where(eq(users.id, realOperatorId));
    expect(user.mustChangePassword).toBe(true);
  });

  it("refuses a target that isn't a Platform Admin", async () => {
    await expect(resetOperatorPassword(plainUserId)).rejects.toThrow(ServiceError);
  });

  it("refuses an id that doesn't exist", async () => {
    await expect(resetOperatorPassword("00000000-0000-0000-0000-000000000000")).rejects.toThrow(
      ServiceError,
    );
  });
});
