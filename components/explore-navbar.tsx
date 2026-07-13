import Link from "next/link";
import { PupitarLogo } from "@/components/logo";

export function ExploreNavbar({
  isAuthenticated,
  userEmail
}: {
  isAuthenticated: boolean;
  userEmail: string | null;
}) {
  const initial = userEmail?.trim().charAt(0).toUpperCase() || "U";

  return (
    <nav className="flex min-h-14 items-center justify-between border-b border-[#2A2A2A] pb-4" aria-label="Explore navigation">
      <Link href="/" className="flex items-center gap-2 text-[16px] font-bold text-[#2067FF] no-underline">
        <PupitarLogo size={18} />
        Pupitar
      </Link>
      {isAuthenticated ? (
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-[13px] font-medium text-[#F0F0F0] transition-colors hover:text-[#2067FF]">Dashboard</Link>
          <Link href="/dashboard/settings" aria-label="Account settings" title={userEmail ?? "Account"} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2067FF] text-[12px] font-bold text-white">{initial}</Link>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-[13px] font-medium text-[#A0A0A0] transition-colors hover:text-[#F0F0F0]">Log in</Link>
          <Link href="/signup" className="rounded-md bg-[#2067FF] px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2F6BFF]">Sign up</Link>
        </div>
      )}
    </nav>
  );
}
