import { listMemberships, requireUser, roleLabel, type AppRole } from "@/lib/auth";
import { OrganizationSwitcher } from "./organization-switcher";
import { Screen, ScrollBody } from "@/components/ui/screen";
import { TopBar } from "@/components/ui/top-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { SettingRow } from "@/components/ui/setting-row";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Row } from "@/components/ui/row";
import { Icon } from "@/components/icon";
import { InstallAppRow } from "@/components/install-app-row";
import { logoutAction } from "../actions";

/**
 * What each role actually gets to do, in one line. The role name alone
 * ("Support Agent") doesn't tell someone whether they're missing a screen
 * or were never meant to have it — which is the question people actually
 * come to this page with. Kept here rather than in lib/auth beside
 * ROLE_LABELS: that module is the auth boundary, and this is screen copy
 * with no other caller.
 */
// Kept honest against the two places that actually decide reach:
// home/page.tsx's SHORTCUTS_BY_ROLE and (dashboard)/layout.tsx's
// NAV_BY_ROLE. Supplier has no Parcels and no Staff; Support Agent has no
// Staff and no purchase queue.
const ROLE_SUMMARY: Record<AppRole, string> = {
  admin: "Full access — staff and invitations, every order, purchasing, parcels and the catalog.",
  support_agent: "Logs and edits orders, and manages customers, products and parcels.",
  supplier: "Works the purchase queue and flags what can't be sourced, with the order log as history.",
};

/** "Yan Min Thwin" → "YT". First and last, the usual convention for an
 *  initials avatar; a single-word name just gives its one letter. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Phase-1 scope only: the design kit's fuller SettingsScreen also has a
// customers list and a time zone. This tab exists at all because moving to
// a bottom-tab shell needed a landing spot for what the old top-nav header
// held directly: sign-out, plus the theme toggle the dark-default token
// system now needs.
//
// Structured as identity first, then the two things that are actually
// settings, because that's the order the questions come in: who am I and
// what can I do here, then change something. The role used to be a 10px
// eyebrow in the TopBar, which is the smallest type in the system — for
// the one fact that decides what the whole app shows you.
export default async function SettingsPage() {
  const user = await requireUser();

  const memberships = await listMemberships(user.id);
  const activeStore = memberships.find((m) => m.organizationId === user.organizationId);

  // Only Stores the user can actually switch into: a suspended one would
  // resolve to no session and bounce them to /login. (The switcher is still
  // named "Organization" internally — organization_id stays the tenant id,
  // ADR-0005 §2 — but a Store is what it switches, one at a time.)
  const switchable = memberships
    .filter((m) => m.status === "active")
    .map((m) => ({
      organizationId: m.organizationId,
      name: m.name,
      role: m.role as AppRole,
      roleLabel: roleLabel(m.role as AppRole),
    }));

  return (
    <Screen>
      <TopBar brand title="Settings" />
      <ScrollBody>
        {/* Identity, as one card rather than three loose rows: name, the
            role that decides what this account can reach, and the Store
            that role is scoped to (a membership is per-Store — the same
            person can be Admin in one and Supplier in another, which is
            exactly why the Store belongs next to the role, not apart from
            it). Card treatment matches Home's draft panel — a module that
            reads out a state, not a list you tap into. */}
        <div className="px-5 pt-4">
          <div className="overflow-hidden rounded-md border border-line-hairline bg-surface-card shadow-raised">
            <div className="flex items-center gap-3.5 px-4 py-4">
              <span
                aria-hidden="true"
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-raised font-ui text-title font-semibold text-text-strong"
              >
                {initials(user.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-ui text-title font-semibold text-text-strong">{user.name}</span>
                <span className="block truncate font-ui text-small text-text-muted">{user.email}</span>
              </span>
            </div>

            {/* Set in display type, not a chip: this is the one fact on the
                screen that explains every other screen. */}
            <div className="border-t border-line-hairline px-4 py-4">
              <span className="block font-mono text-label tracking-label uppercase text-text-faint">Your role</span>
              <span className="mt-1.5 block font-display text-display-sm tracking-display text-text-strong">
                {roleLabel(user.role)}
              </span>
              <p className="mt-1.5 font-ui text-small text-text-muted">{ROLE_SUMMARY[user.role]}</p>
            </div>

            {activeStore ? (
              <div className="flex items-center justify-between gap-3 border-t border-line-hairline px-4 py-3.5">
                <span className="shrink-0 font-mono text-label tracking-label uppercase text-text-faint">Store</span>
                <span className="min-w-0 truncate font-ui text-body-strong text-text-strong">{activeStore.name}</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Hidden entirely for the common case of one membership — a
            switcher with a single option is just a confusing readout, and
            the card above already names the Store. */}
        {switchable.length > 1 && (
          <>
            <SectionHeader>Switch store</SectionHeader>
            <OrganizationSwitcher organizations={switchable} activeOrganizationId={user.organizationId} />
          </>
        )}

        {/* Both of these are per-device, not per-account: the theme lives in
            this browser's localStorage and an install lands on this phone's
            home screen. Naming the section that way is the difference
            between "why didn't my theme follow me" being a bug report and
            being answered on the screen. */}
        <SectionHeader>This device</SectionHeader>
        <SettingRow label="Theme">
          <ThemeToggle />
        </SettingRow>
        <InstallAppRow />

        {/* No "Platform admin" section here — the operator surface is a
            separate app entirely (/platform), and a platform operator is
            never in this (tenant) Settings screen. See src/lib/auth. */}
        <SectionHeader>Account</SectionHeader>
        <Row href="/change-password">
          <span className="flex-1">Change password</span>
          <Icon name="chevron-right" size={16} className="shrink-0 text-text-faint" />
        </Row>

        <div className="px-5 pt-5 pb-8">
          <form action={logoutAction}>
            <Button full type="submit" variant="secondary" icon="log-out">
              Sign out
            </Button>
          </form>
        </div>
      </ScrollBody>
    </Screen>
  );
}
