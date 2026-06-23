import { StoreLeaderboard } from "@/components/stores/store-leaderboard";

/** Store performance — current-month leaderboard for every store (fast matview roll-up). */
export default function StoresPage() {
  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="font-heading text-lg font-semibold">Store performance</h1>
        <p className="text-muted-foreground text-sm">
          This month, every store — ranked by net sale. Sort any column.
        </p>
      </div>
      <StoreLeaderboard />
    </div>
  );
}
