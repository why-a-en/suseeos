import { ScreenLoading, LoadingLabelRow } from "@/components/ui/screen-loading";

// A short form, not a list: three fields and a button.
export default function Loading() {
  return (
    <ScreenLoading title="New customer" backHref="/customers">
      <LoadingLabelRow />
      <LoadingLabelRow />
      <LoadingLabelRow />
    </ScreenLoading>
  );
}
