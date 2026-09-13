"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformUser, roleLabel } from "@/lib/auth";
import { assertDeliverableEmail, normalizeEmail } from "@/lib/email/address";
import { sendInvitationEmail } from "@/lib/email/send";
import {
  cancelPlatformInvitation,
  createStore,
  resendPlatformInvitation,
  setStoreStatus,
} from "@/services/platform";
import { ServiceError } from "@/services/types";

// Thin wrappers — rules live in src/services/platform.ts. requirePlatformUser()
// on every action, not just the page: hiding a link is not access control.

export type PlatformActionResult = { error?: string };

/** On success, the address the new Admin's invitation was emailed to. */
export type NewStoreResult = PlatformActionResult & {
  slug?: string;
  invitedEmail?: string;
};

export async function createStoreAction(
  _prev: NewStoreResult | undefined,
  formData: FormData,
): Promise<NewStoreResult> {
  const platformUser = await requirePlatformUser();

  const storeName = String(formData.get("storeName") ?? "").trim();
  const adminEmail = normalizeEmail(String(formData.get("adminEmail") ?? ""));

  let created: Awaited<ReturnType<typeof createStore>>;
  try {
    // Before we create anything: is this address even deliverable? A bad one
    // here is a hard bounce Resend holds against the whole sending domain.
    await assertDeliverableEmail(adminEmail);
    created = await createStore({
      storeName,
      adminEmail,
      invitedById: platformUser.id,
    });
  } catch (error) {
    if (error instanceof ServiceError) return { error: error.message };
    throw error;
  }

  revalidatePath("/platform/stores");

  // The invitations row already exists — created is the record, not a
  // credential that vanishes if this send fails. If Resend won't take it,
  // say so; resendStoreInvitationAction below is exactly that recourse,
  // from the Store's own detail page.
  try {
    await sendInvitationEmail({
      to: created.adminEmail,
      storeName,
      roleLabel: roleLabel("admin"),
      token: created.invitationId,
      inviterName: platformUser.name,
    });
  } catch {
    return {
      error:
        "The Store was created and the invitation recorded, but the email failed to send.",
    };
  }

  return { slug: created.slug, invitedEmail: created.adminEmail };
}

export async function setStoreStatusAction(
  storeId: string,
  status: "active" | "suspended",
): Promise<PlatformActionResult> {
  await requirePlatformUser();
  try {
    await setStoreStatus({ storeId, status });
    revalidatePath("/platform/stores");
    // A suspended Store must stop resolving to a session for its
    // members — bust the whole tenant layout cache.
    revalidatePath("/", "layout");
    return {};
  } catch (error) {
    if (error instanceof ServiceError) return { error: error.message };
    throw error;
  }
}

/** Re-sends a still-pending invitation issued from `/platform` — the
 *  operator's recourse when the first send bounced or was lost. */
export async function resendStoreInvitationAction(
  storeId: string,
  invitationId: string,
): Promise<PlatformActionResult> {
  const platformUser = await requirePlatformUser();

  let resent: Awaited<ReturnType<typeof resendPlatformInvitation>>;
  try {
    resent = await resendPlatformInvitation(invitationId, platformUser.id);
  } catch (error) {
    if (error instanceof ServiceError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/platform/stores/${storeId}`);

  try {
    await sendInvitationEmail({
      to: resent.email,
      storeName: resent.storeName,
      roleLabel: roleLabel(resent.role),
      token: resent.invitationId,
      inviterName: platformUser.name,
    });
  } catch {
    return { error: "Resent, but the email failed to send." };
  }

  return {};
}

/** Revokes a still-pending invitation issued from `/platform`. */
export async function cancelStoreInvitationAction(
  storeId: string,
  invitationId: string,
): Promise<PlatformActionResult> {
  await requirePlatformUser();
  try {
    await cancelPlatformInvitation(invitationId);
  } catch (error) {
    if (error instanceof ServiceError) return { error: error.message };
    throw error;
  }
  revalidatePath(`/platform/stores/${storeId}`);
  return {};
}
