import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A label on the left, its value or control on the right.
 *
 *  The counterpart to `Row` for screens that read out *settings* rather than
 *  list *records*: same full-bleed rhythm (`px-5 py-3`, hairline underneath)
 *  so the two stack without a seam, but never interactive as a whole — the
 *  control on the right is the tap target, not the row. A row that navigates
 *  is still `Row href`.
 *
 *  Exists because this exact shell was hand-rolled in four places across
 *  Settings and InstallAppRow, which is how the theme row and the install
 *  row ended up one padding step apart from each other more than once. */
export function SettingRow({
  label,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  /** A second line under the label — what the setting actually does, when
   *  the label alone doesn't say it. */
  hint?: ReactNode;
  /** The value or control this row is for. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-line-hairline px-5 py-3", className)}>
      <span className="min-w-0">
        <span className="block truncate">{label}</span>
        {hint ? <span className="mt-0.5 block font-ui text-small text-text-faint">{hint}</span> : null}
      </span>
      {children ? <span className="flex shrink-0 items-center gap-2">{children}</span> : null}
    </div>
  );
}
