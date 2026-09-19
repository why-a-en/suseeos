"use client";

import { Row } from "@/components/ui/row";
import { Icon } from "@/components/icon";
import type { AppRole } from "@/services/types";

/** The three roles, with what each one actually reaches. The summaries are
 *  the same facts Settings prints for your own role — kept honest against
 *  home/page.tsx's SHORTCUTS_BY_ROLE and (dashboard)/layout.tsx's
 *  NAV_BY_ROLE, which are what really decide it. */
export const ROLE_CHOICES: { value: AppRole; label: string; summary: string }[] = [
  { value: "support_agent", label: "Support Agent", summary: "Orders, customers, products and parcels" },
  { value: "supplier", label: "Supplier", summary: "Purchase queue and sourcing" },
  { value: "admin", label: "Admin", summary: "Full access, including staff" },
];

/**
 * Picks a role as a list of rows, not a SegmentedControl.
 *
 * The segmented control is this system's *filter* control (see its own doc
 * comment — Parcels' stages, Orders' draft/placed), so wearing it here made
 * choosing a role look like narrowing a list. Rows also leave somewhere to
 * say what each role grants, which a three-up segment strip has no space
 * for and which is the actual question being asked.
 *
 * `current` is the role already saved, and is only meaningful where this
 * edits an existing member: when the selection has moved away from it, that
 * row keeps a "current" marker so it's clear what's still in force and that
 * nothing has been committed yet. Omit it on a create form, where there is
 * no prior value and the form's own submit is the commit.
 */
export function RoleChoice({
  value,
  onChange,
  current,
  disabled = false,
}: {
  value: AppRole;
  onChange: (role: AppRole) => void;
  current?: AppRole;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Role">
      {ROLE_CHOICES.map((choice) => {
        const selected = choice.value === value;
        const isCurrent = current === choice.value && current !== value;
        return (
          <Row
            key={choice.value}
            onClick={disabled ? undefined : () => onChange(choice.value)}
            className={selected ? "bg-surface-hover" : undefined}
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={selected ? "truncate text-text-strong" : "truncate"}>{choice.label}</span>
              <span className="truncate font-ui text-small text-text-faint">{choice.summary}</span>
            </span>
            {selected ? (
              <Icon name="check" size={18} className="shrink-0 text-text-strong" />
            ) : isCurrent ? (
              <span className="shrink-0 font-mono text-label tracking-label uppercase text-text-faint">current</span>
            ) : null}
          </Row>
        );
      })}
    </div>
  );
}
