// Provisions a platform operator — one of us, who runs SuSeeOS.
//
// An operator is a `users` row + credential account with **NO tenant
// membership**: no `members` row, no Organization, no tenant role. They live
// only under /platform and reach a client's data by impersonating.
//
// Requires the *unpooled/owner* DATABASE_URL_UNPOOLED — the app's own
// pooled connection (the `app_user` role) can write PLATFORM_ADMIN_ROLE
// onto nothing, deliberately: there is no in-app path to becoming an
// operator (docs/adr/0007-platform-admin-role.md). Only a script run with
// these elevated, direct DB credentials can.
//
//   pnpm platform:add ops@suseeos.com "Yan Min" <password>
//
// To promote someone who already has an account, use
// scripts/grant-platform-admin.mts instead — this one refuses an existing
// email rather than silently changing what it points at.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

const { auth } = await import("../src/lib/auth/config");
const { db } = await import("../src/db/client");
const { users } = await import("../src/db/schema");
const { eq } = await import("drizzle-orm");
const { PLATFORM_ADMIN_ROLE } = await import("../src/lib/auth/platform-admins");

const [email, fullName, password] = process.argv.slice(2);

if (!email || !fullName || !password) {
  console.error('Usage: pnpm platform:add <email> "<Full Name>" <password>');
  process.exit(1);
}

const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
if (existing) {
  console.error(`A user with email "${email}" already exists (id ${existing.id}).`);
  console.error("If they should be an operator, run: pnpm platform:grant " + email);
  process.exit(1);
}

// Through better-auth so the credential account matches sign-in exactly.
// The password is theirs — no forced change.
await auth.api.signUpEmail({ body: { email, password, name: fullName } });

const [user] = await db
  .update(users)
  .set({ role: PLATFORM_ADMIN_ROLE })
  .where(eq(users.email, email))
  .returning({ id: users.id });
if (!user) throw new Error("user was not created");

console.log(`Created operator account: ${email} (${user.id})`);
console.log("They can sign in immediately — no further steps.");

process.exit(0);
