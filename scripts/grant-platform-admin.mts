// Promotes an *existing* user to platform operator — the recovery path
// after a data wipe leaves a preserved account without its flag, or for
// adding a second operator so a solo one is never one lost password away
// from raw SQL (docs/adr/0007-platform-admin-role.md recommends keeping at
// least two).
//
// Requires the *unpooled/owner* DATABASE_URL_UNPOOLED, same reasoning as
// scripts/add-platform-admin.mts: this deliberately isn't reachable through
// the running app.
//
//   pnpm platform:grant ops@suseeos.com
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

const { db } = await import("../src/db/client");
const { users } = await import("../src/db/schema");
const { eq } = await import("drizzle-orm");
const { PLATFORM_ADMIN_ROLE, isPlatformAdmin } = await import("../src/lib/auth/platform-admins");

const [email] = process.argv.slice(2);

if (!email) {
  console.error("Usage: pnpm platform:grant <email>");
  process.exit(1);
}

const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
if (!existing) {
  console.error(`No user with email "${email}" — use pnpm platform:add to create one.`);
  process.exit(1);
}
if (isPlatformAdmin(existing.role)) {
  console.error(`${email} is already a Platform Admin.`);
  process.exit(1);
}

await db.update(users).set({ role: PLATFORM_ADMIN_ROLE }).where(eq(users.id, existing.id));

console.log(`${email} (${existing.id}) is now a Platform Admin.`);
console.log("Their existing password is unchanged — they sign in as before.");

process.exit(0);
