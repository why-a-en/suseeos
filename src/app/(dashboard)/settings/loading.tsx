import { ScreenLoading, LoadingSectionHeader, LoadingLabelRow } from "@/components/ui/screen-loading";

// Matches settings/page.tsx's shape: label/value rows under section
// headers, not a scrolling record list — Settings reads out settings, it
// doesn't list anything. Five rows under "Account" (name, email, role,
// store, change password); the "App" section isn't drawn because it may not
// render at all (see InstallAppRow), and a skeleton promising a section
// that never arrives is worse than one that under-promises.
export default function Loading() {
  return (
    <ScreenLoading title="Settings" brand>
      <LoadingSectionHeader />
      <LoadingLabelRow />
      <LoadingLabelRow />
      <LoadingLabelRow />
      <LoadingLabelRow />
      <LoadingLabelRow />
    </ScreenLoading>
  );
}
