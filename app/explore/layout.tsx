import type { ReactNode } from "react";
import { DashboardThemeSurface } from "@/components/dashboard-theme-provider";

export default function ExploreLayout({ children }: { children: ReactNode }) {
  return <DashboardThemeSurface>{children}</DashboardThemeSurface>;
}
