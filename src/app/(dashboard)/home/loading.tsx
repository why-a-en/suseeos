import { ScreenLoading, LoadingHeadline, LoadingStatTiles, LoadingShortcutsGrid } from "@/components/ui/screen-loading";

// Matches home/page.tsx: the greeting line, 2 stat tiles, then the
// Shortcuts grid. Skips the optional Draft orders panel below — it only
// renders for some roles, and this is close enough to read as "Home" the
// instant it appears.
export default function Loading() {
  return (
    <ScreenLoading title="Home" brand>
      <LoadingHeadline />
      <LoadingStatTiles count={2} />
      <LoadingShortcutsGrid count={4} />
    </ScreenLoading>
  );
}
