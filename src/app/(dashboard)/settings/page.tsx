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

// Phase-1 scope only: the design kit's fuller SettingsScreen also has a
// customers list and a time zone. This tab exists at all because moving to a
// bottom-tab shell needed a landing spot for what the old top-nav header
// held directly: sign-out, plus the theme switch the dark-default token
// system now needs.
//
// The role used to be a 10px eyebrow in the TopBar — the smallest type in
// the system, for the one fact that decides what every other screen shows
// you. It's a plain labelled row now, same weight as Name and Email, with
// the Store beside it: a membership is per-Store (the same person can be
// Admin in one and Supplier in another), so the role means little without
// naming which Store it's in.
//
// The theme switch sits in the TopBar rather than in a row of its own —
// it's app chrome, and putting it there leaves "App" (install) as the only
// other group, which InstallAppRow owns end to end.
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
      <TopBar brand title="Settings" right={<ThemeToggle />} />
      <ScrollBody>
        {/* No "Platform admin" section here — the operator surface is a
            separate app entirely (/platform), and a platform operator is
            never in this (tenant) Settings screen. See src/lib/auth. */}
        <SectionHeader>Account</SectionHeader>
        <SettingRow label="Name">
          <span className="font-ui text-body-strong text-text-strong">{user.name}</span>
        </SettingRow>
        <SettingRow label="Email">
          <span className="truncate font-ui text-body-strong text-text-strong">{user.email}</span>
        </SettingRow>
        <SettingRow label="Role">
          <span className="font-ui text-body-strong text-text-strong">{roleLabel(user.role)}</span>
        </SettingRow>
        {activeStore ? (
          <SettingRow label="Store">
            <span className="truncate font-ui text-body-strong text-text-strong">{activeStore.name}</span>
          </SettingRow>
        ) : null}
        <Row href="/change-password">
          <span className="flex-1">Change password</span>
          <Icon name="chevron-right" size={16} className="shrink-0 text-text-faint" />
        </Row>

        {/* Hidden entirely for the common case of one membership — a
            switcher with a single option is just a confusing readout, and
            the Store row above already names the one they're in. */}
        {switchable.length > 1 && (
          <>
            <SectionHeader>Switch store</SectionHeader>
            <OrganizationSwitcher organizations={switchable} activeOrganizationId={user.organizationId} />
          </>
        )}

        {/* Brings its own "App" header — it renders nothing at all on a
            platform that can't offer an install, and a header owned by this
            page would be left hanging over that gap. */}
        <InstallAppRow />

        <div className="px-5 pt-6 pb-8">
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
