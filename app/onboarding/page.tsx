import { Suspense } from "react";
import OnboardingFlow from "./onboarding-flow";

export const metadata = {
  title: "Get started — Pupitar",
  description: "Set up your Pupitar account in a few quick steps."
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-bg text-ink">Loading...</div>}>
      <OnboardingFlow />
    </Suspense>
  );
}
