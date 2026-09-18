import { ScreenLoading, LoadingRows } from "@/components/ui/screen-loading";

// Matches unsourced/page.tsx: rows with its own circular "×" badge, no
// toolbar on this screen.
export default function Loading() {
  return (
    <ScreenLoading title="Unsourced" backHref="/home">
      <LoadingRows avatar="circle" />
    </ScreenLoading>
  );
}
