import type { ReactNode } from "react";
import { DashboardThemeProvider } from "@/components/dashboard-theme-provider";

export default function DashboardLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return <DashboardThemeProvider>{children}</DashboardThemeProvider>;
}
