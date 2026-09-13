// Who runs SuSeeOS. `users.role = PLATFORM_ADMIN_ROLE` is the single source
// of truth — see docs/adr/0007-platform-admin-role.md for why this replaced
// the PLATFORM_ADMIN_USER_IDS env var. The property that matters survives
// the move unchanged: nothing in this app's own server actions ever writes
// `users.role` to this value, so there is still no in-app path to becoming
// one, and a database compromise still can't grant it on its own — that
// requires the *elevated, direct* DB credentials scripts/grant-platform-
// admin.mts needs, never the connection any running request uses.
//
// Framework-free on purpose: `src/services/` reads this too, and nothing
// under services may depend on the Next.js side of the app. `src/lib/auth`
// re-exports it for feature code.

export const PLATFORM_ADMIN_ROLE = "platform_admin";

/**
 * Is this the platform-operator role? Takes the role value itself, not a
 * user id — callers already have it for free on `session.user.role` (a
 * field the admin plugin registers, so it rides along with every session
 * lookup at zero extra cost, the same way the old env-var check was zero
 * extra cost). Never look this up with a fresh query on the hot path; see
 * resolveSession() in ./index.ts for the one place a query is worth it
 * (mustChangePassword, which isn't part of the session payload).
 */
export function isPlatformAdmin(role: string | null | undefined): boolean {
  return role === PLATFORM_ADMIN_ROLE;
}
