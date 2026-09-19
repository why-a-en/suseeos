import { ScreenLoading, LoadingSectionHeader, LoadingLabelRow } from "@/components/ui/screen-loading";

// A status chip, then five label/value rows — a readout, not a list.
export default function Loading() {
  return (
    <ScreenLoading title="Parcel" backHref="/parcels">
      <LoadingSectionHeader />
      <LoadingLabelRow />
      <LoadingLabelRow />
      <LoadingLabelRow />
      <LoadingLabelRow />
      <LoadingLabelRow />
    </ScreenLoading>
  );
}
