import { ScreenLoading, LoadingIdentityCard, LoadingSectionHeader, LoadingLabelRow } from "@/components/ui/screen-loading";

// Matches settings/page.tsx's shape: the identity card first, then
// label/value rows under section headers — Settings reads out settings, it
// doesn't list anything, so nothing here is row-with-thumbnail shaped.
export default function Loading() {
  return (
    <ScreenLoading title="Settings" brand>
      <LoadingIdentityCard />
      <LoadingSectionHeader />
      <LoadingLabelRow />
      <LoadingLabelRow />
      <LoadingSectionHeader />
      <LoadingLabelRow />
    </ScreenLoading>
  );
}
