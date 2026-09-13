import Link from "next/link";
import { requireAnySession } from "@/lib/auth";
import { Logo } from "@/components/ui/logo";
import { ChangePasswordForm } from "./change-password-form";

// Deliberately in the (auth) group rather than under (dashboard) or
// platform/. Both of those layouts carry the forced-change redirect for
// their own kind of session, so a screen inside either would redirect to
// itself forever. Keeping it out of both groups makes the loop structurally
// impossible instead of relying on a path check — and lets this one screen
// serve a tenant user and a platform operator alike (requireAnySession(),
// not requireUser()); nothing about changing your own password differs
// between the two.
export default async function ChangePasswordPage() {
  const session = await requireAnySession();
  const forced = session.user.mustChangePassword;

  return (
    <main className="ds-grain-surface flex min-h-full flex-1 items-center justify-center bg-surface-page p-4">
      <div className="w-full max-w-[360px] space-y-6">
        <div className="space-y-1">
          <Logo size={32} wordmark />
          <p className="font-ui text-small text-text-muted">
            {forced
              ? "Your password was set by someone else. Choose your own before continuing."
              : "Change your password."}
          </p>
        </div>

        <ChangePasswordForm forced={forced} />

        {/* No way out while forced — that is the point. Otherwise this is an
            ordinary settings screen and should be leaveable, back to
            whichever surface this session belongs to — a platform operator
            has no /settings. */}
        {!forced && (
          <Link
            href={session.kind === "platform" ? "/platform" : "/settings"}
            className="ds-nav-link block text-center font-ui text-small text-text-muted"
          >
            {session.kind === "platform" ? "Back to Operator" : "Back to Settings"}
          </Link>
        )}
      </div>
    </main>
  );
}
