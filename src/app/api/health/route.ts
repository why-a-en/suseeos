import { sql } from "drizzle-orm";
import { db } from "@/db/client";

// Uptime-checker target (proxy.ts exempts this path from the auth gate —
// an external pinger has no session to send). Checks the database, not
// just "the Next.js process is up": a Neon outage or a bad DATABASE_URL
// leaves the server perfectly capable of answering with a 200 while every
// real page 500s, which is the one failure mode a plain liveness check
// can't tell apart from actually working.
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok" });
  } catch (error) {
    return Response.json(
      { status: "error", detail: error instanceof Error ? error.message : String(error) },
      { status: 503 },
    );
  }
}
