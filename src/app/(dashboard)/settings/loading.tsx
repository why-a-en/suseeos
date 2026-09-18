import { ScreenLoading, LoadingSectionHeader, LoadingLabelRow } from "@/components/ui/screen-loading";

// Matches settings/page.tsx's shape: label/value rows under section
// headers, not a scrolling record list — Settings reads out settings, it
// doesn't list anything.
export default function Loading() {
  return (
    <ScreenLoading title="Settings" brand>
      <LoadingSectionHeader />
      <LoadingLabelRow />
      <LoadingLabelRow />
      <LoadingSectionHeader />
      <LoadingLabelRow />
      <LoadingLabelRow />
    </ScreenLoading>
  );
}
