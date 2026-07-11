import type { ReactNode } from "react";

export default function DashboardLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return <div className="pupitar-dashboard min-h-screen">{children}</div>;
}
