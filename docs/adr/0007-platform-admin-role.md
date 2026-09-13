---
status: accepted
amends: ADR-0002 (§ platform-admin console update), ADR-0003 (recovery now covers operators too)
---

# Platform Admin is `users.role`, not an env var — and can finally reset its own password

Platform-operator status has been `PLATFORM_ADMIN_USER_IDS`, a comma-
separated list of `users.id`s in Vercel's environment config, since the
first platform console update to ADR-0002. That design bought one real
property deliberately: **no in-app path to becoming an operator** — a bug
or a breach in the running app's own code can't grant it, because granting
it means editing deploy config in a completely different system. This ADR
keeps that property. It does not keep the mechanism.

## The problem that forces this

Two real incidents during the same launch push surfaced the actual cost of
the env-var mechanism, as opposed to the property it was bought for:

1. **No recovery path exists for a locked-out operator — not even an
   Admin-initiated one.** ADR-0003 correctly refuses a *public* self-service
   reset (an email address isn't a secret; "this account has signed in
   before" authenticates nobody). What it *does* build — an Admin resets a
   colleague, generated password, emailed, forced replacement — is scoped to
   tenant `members`. A Platform Admin has no `members` row, so that flow
   structurally never reaches them. The result: the sole operator forgetting
   a password had no recourse but hand-written SQL and a manually computed
   argon2id hash, in a chat transcript, against a live database.

2. **The env var and the database can silently drift.** `PLATFORM_ADMIN_
   USER_IDS` hard-codes a UUID; the row it names lives in Postgres. A data
   wipe that preserves an operator's *email* but recreates the row gives it
   a fresh id the env var no longer matches — access breaks with no error,
   no warning, just a login that works and lands nowhere useful. This is
   exactly what happened partway through today's production cleanup.

Both are made worse by the same friction: changing `PLATFORM_ADMIN_USER_IDS`
at all means finding the right Vercel project, the right environment, and
triggering a redeploy — for local dev, an app restart. A two-minute in-app
fix instead costs a deploy cycle every time.

## The shape of the decision

**1. `users.role = "platform_admin"` (`PLATFORM_ADMIN_ROLE`) replaces the
allowlist.** `users.role` already existed in the schema for exactly this —
left permanently null on the theory that populating it would need giving up
the "no in-app path" property. That theory was already false: better-auth's
`admin` plugin stamps every *other* new user with its own default role
(`"user"`) on creation the moment the plugin is installed at all, regardless
of which designation mechanism (`adminUserIds` or `adminRoles`) is
configured — confirmed empirically against a real signup before writing any
of this. The column was never actually inert; only the one value that
matters was.

**2. The trust boundary moves, it doesn't disappear.** Granting the role is
still not reachable from any running request. `scripts/add-platform-admin.mts`
and the new `scripts/grant-platform-admin.mts` write it directly, requiring
`DATABASE_URL_UNPOOLED` — the same elevated, direct DB credentials the
existing migration tooling already needs, never the pooled `app_user`
connection the deployed app uses. No server action, API route, or form
handler in this codebase writes `users.role` to `PLATFORM_ADMIN_ROLE`; that
invariant is the whole point and should be treated as load-bearing in review,
the same way "no in-app path" was treated as load-bearing before it.
Compromising the database directly still grants it — as it already would
have granted almost everything else (every credential hash, every row,
RLS's own enforcement) — but compromising the *running app* (a bug in a
server action, a hijacked session, a dependency compromise) does not, same
as before.

**3. better-auth's own `adminRoles` option drives this — not a workaround.**
The admin plugin natively supports designating admins by role instead of by
id list (`adminRoles`, checked against `users.role`), with `defaultRole`
already defaulting to `"user"` regardless. `adminUserIds` and `adminRoles`
are two supported modes of the same plugin; this switches modes, it doesn't
fight the framework. `platform_admin` is a custom role name (not the
plugin's built-in `"admin"`) carrying the exact same permission set —
naming it distinctly keeps it from being confused with `members.role =
"admin"`, the tenant Store's own admin, a completely different axis (see
the note atop `src/lib/auth/index.ts`).

**4. `isPlatformAdmin()` takes a role, not an id — and stays free.**
`session.user.role` rides along with every session lookup already, because
the admin plugin registers `role` as one of the fields returned by
`getSession()`, same as `.id`/`.name`/`.email`. Verified by direct
inspection of that payload, not assumed: this is genuinely zero extra I/O,
preserving the exact performance property the cookie-cache session design
was built for (ADR-0002's "single biggest latency win… for a user on a
Myanmar mobile network"). The one query this ADR adds —
`mustChangePassword`, which isn't part of that payload — runs only on the
rare platform-operator path, never on the tenant path every other request
takes.

**5. A Platform Admin can now reset a fellow operator's password.**
`resetOperatorPassword` (`src/services/platform.ts`) mirrors `resetStaff
Password` (`src/services/staff.ts`) exactly: generated, never chosen by the
resetter, one-time, forces replacement via `must_change_password` on next
sign-in, delivered by the existing `sendCredentialsEmail` (ADR-0006) rather
than shown on screen. Reachable from `/platform/users`, on another
operator's row only — never your own; that mirrors ADR-0003's own reasoning
that the resetter must not be the person losing access to their old
password, extended to the one role ADR-0003's own flow couldn't reach.

**6. The forced-change gate now covers both surfaces.** `PlatformUser`
gained `mustChangePassword`; `platform/layout.tsx` gained the same redirect-
to-`/change-password` gate `(dashboard)/layout.tsx` already had. Without
this, decision 5's flag would sit on the row with no enforcement — exactly
the gap that made it worth checking rather than assuming. `/change-password`
itself now resolves either kind of session (`requireAnySession()`, new) and
redirects back to `/` or `/platform` on completion — it was already
deliberately outside both route groups specifically so the forced-redirect
couldn't loop, which turned out to make sharing it across both trivial.

## Considered and rejected

- **Keep the id allowlist, just fix the reset gap.** Would have solved
  incident 1 without touching the mechanism at all. Rejected because it
  leaves incident 2 (silent drift after any future data operation) and the
  redeploy-per-change friction exactly as they are — the mechanism itself
  was asked about, not only its most acute symptom.

- **A `platform_admins` table, writable through an in-app "manage operators"
  screen.** The friction-free option, and the one that gives up the actual
  security property: any code path that can write that table (even one
  gated behind "only an existing operator may call this") turns a single
  application bug into a self-elevation route. `users.role`, set only by a
  script holding elevated DB credentials, keeps the requirement at "you need
  infrastructure access," not "you need to find one flaw in one gate."

- **Self-service "forgot password" for operators specifically.** ADR-0003's
  argument (an email address isn't a secret; "has signed in before"
  authenticates nobody) applies exactly as much to operators as to tenant
  staff. Rejected for the same reason it was rejected there.

## Deferred, deliberately

- **Revoking platform-admin status.** Granting flows through the new
  scripts; revoking still means a direct `UPDATE users SET role = NULL`.
  Asymmetric on purpose for now — revocation is rarer, more urgent, and
  arguably *should* stay a step no running app session can be tricked into
  taking, more than granting should.

- **An in-app "operators" list distinct from the general Users list.**
  `/platform/users` already shows who's an operator (the "· operator" tag);
  a dedicated view is a convenience, not a decision this ADR needs to make.

- **Enforcing "at least two operators" in code.** Recommended operational
  practice — with a second operator, incident 1 above becomes a two-minute
  in-app reset instead of raw SQL — but not a constraint the schema or an
  action enforces. Revisit if a solo-operator lockout happens again.

## Consequences

**Changed:** `src/lib/auth/config.ts` (`admin()` uses `adminRoles` +
a custom `platformAdminRole`, not `adminUserIds`); `src/lib/auth/platform-
admins.ts` (`isPlatformAdmin(role)`, not `(userId)`); `src/lib/auth/index.ts`
(`PlatformUser` gains `mustChangePassword`; new `requireAnySession()`;
`changeOwnPassword()` works for either session kind); `src/services/
platform.ts` (`listUsers()`'s `isOperator` check, new `resetOperatorPassword`);
`src/lib/email/send.ts` (`sendCredentialsEmail`'s `organizationName` is now
optional); `platform/layout.tsx` (forced-change gate); `/change-password`
(serves both session kinds); `scripts/add-platform-admin.mts` (grants the
role directly, no more manual env-var step); new `scripts/grant-platform-
admin.mts`.

**Removed:** `PLATFORM_ADMIN_USER_IDS` from `.env.example`, `README.md`,
and every environment it was configured in (Vercel Production/Preview,
local `.env.local`) — the DB row, not deploy config, is the source of truth
now.

**Unchanged:** the actual authorization boundary. `requirePlatformUser()`
still gates every `/platform` screen and action; a database compromise
still can't grant the role without also compromising the elevated
credentials the granting scripts need; a tenant user still has no path to
`/platform` through anything this app exposes.
