import type { Metadata } from "next";
import { DashboardThemeProvider } from "@/components/dashboard-theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pupitar",
  description: "Version control for AI prompts and evals",
  icons: {
    icon: "/icon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><DashboardThemeProvider>{children}</DashboardThemeProvider></body>
    </html>
  );
}
