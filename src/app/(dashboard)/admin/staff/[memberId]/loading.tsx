import { ScreenLoading, LoadingSectionHeader, LoadingLabelRow, LoadingRows } from "@/components/ui/screen-loading";

// Account rows, then the three role rows (two lines each, no avatar).
export default function Loading() {
  return (
    <ScreenLoading title="Staff" backHref="/admin/staff">
      <LoadingSectionHeader />
      <LoadingLabelRow />
      <LoadingLabelRow />
      <LoadingLabelRow />
      <LoadingSectionHeader />
      <LoadingRows count={3} avatar="none" />
    </ScreenLoading>
  );
}
