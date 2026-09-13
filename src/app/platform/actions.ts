"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logout, requirePlatformUser, startImpersonation } from "@/lib/auth";
import { resetOperatorPassword } from "@/services/platform";
import { sendCredentialsEmail } from "@/lib/email/send";
import { ServiceError } from "@/services/types";

export async function operatorLogoutAction() {
  await logout();
  redirect("/login");
}

/**
 * Resets a fellow operator's password from the Users list — the piece
 * PLATFORM_ADMIN_USER_IDS never had (docs/adr/0007-platform-admin-role.md).
 * Deliberately no self-service path in here: the button that calls this
 * only ever renders on *another* operator's row (users-view.tsx), never
 * your own — the same reasoning ADR-0003 gives for staff resets, that the
 * resetter must be someone other than the person losing access to their old
 * password.
 */
export async function resetOperatorPasswordAction(
  userId: string,
): Promise<{ error?: string; emailedTo?: string }> {
  await requirePlatformUser();

  let result: Awaited<ReturnType<typeof resetOperatorPassword>>;
  try {
    result = await resetOperatorPassword(userId);
  } catch (error) {
    if (error instanceof ServiceError) return { error: error.message };
    throw error;
  }

  try {
    await sendCredentialsEmail({
      to: result.email,
      name: result.name,
      temporaryPassword: result.temporaryPassword,
    });
  } catch {
    return {
      error: "The password was reset, but the email failed to send. Try Reset password again.",
    };
  }

  return { emailedTo: result.email };
}

/**
 * Start acting as `email`'s user — the one-tap version behind the
 * Impersonate button on the users list and an Organization's member list.
 * Guarded inside startImpersonation() (requirePlatformUser + the audit row);
 * the check here matches every other action.
 */
export async function impersonateAction(email: string): Promise<{ error?: string }> {
  await requirePlatformUser();
  try {
    await startImpersonation(email);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not impersonate." };
  }
  revalidatePath("/", "layout");
  // Outside the try — redirect() throws to signal, and the session is now
  // the target tenant user, so `/` lands in the normal app with the banner.
  redirect("/");
}
