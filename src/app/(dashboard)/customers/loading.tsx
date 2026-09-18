import { ScreenLoading, LoadingSearchToolbar, LoadingRows } from "@/components/ui/screen-loading";

// Matches customers-view.tsx: search toolbar, then rows with CustomerRow's
// own circular initials avatar.
export default function Loading() {
  return (
    <ScreenLoading title="Customers" backHref="/home">
      <LoadingSearchToolbar />
      <LoadingRows avatar="circle" />
    </ScreenLoading>
  );
}
