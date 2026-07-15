import { AppShell } from "@/components/app-shell";
import { HomePageSkeleton } from "@/components/page-skeleton";

export default function HomeLoading() {
  return (
    <AppShell>
      <HomePageSkeleton />
    </AppShell>
  );
}
