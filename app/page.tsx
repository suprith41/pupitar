import Link from "next/link";
import { Nunito, Source_Serif_4 } from "next/font/google";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  display: "swap"
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap"
});

const badges = [
  "Branching",
  "Eval-gated merges",
  "Version history",
  "Live API endpoint",
  "Diff view",
  "Playground",
  "Prompt versioning",
  "Deploy in one click"
];

const features = [
  {
    label: "BRANCHING",
    heading: "Ship without fear.",
    body: "Branch your prompt, test changes in isolation, merge only when evals pass."
  },
  {
    label: "EVALS",
    heading: "Prove every change.",
    body: "Run structured test cases against any version. See pass/fail before it reaches production."
  },
  {
    label: "DEPLOY",
    heading: "One click to live.",
    body: "Get a live API endpoint for your prompt. Call it from anywhere with an API key."
  }
];

const steps = [
  {
    number: "01",
    heading: "Write",
    body: "Write your system prompt in the editor."
  },
  {
    number: "02",
    heading: "Branch",
    body: "Create a branch to experiment safely."
  },
  {
    number: "03",
    heading: "Eval",
    body: "Run test cases to validate behavior."
  },
  {
    number: "04",
    heading: "Deploy",
    body: "Ship to a live API endpoint."
  }
];

export default function Home() {
  return (
    <main className={`min-h-screen bg-white text-[#111111] ${sourceSerif.className}`}>
      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .marquee-track {
          animation: scroll 30s linear infinite;
        }
      `}</style>

      <header className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-6 py-5 md:px-10">
          <Link href="/" className={`${nunito.className} text-[18px] font-bold text-[#111111]`}>
            Pupitar
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-[14px] text-[#111111] hover:underline">
              Log in
            </Link>
            <Link
              href="/dashboard"
              className={`${nunito.className} rounded-[6px] bg-[#111111] px-[18px] py-2 text-[14px] font-bold text-white transition-opacity hover:opacity-90`}
            >
              Get started →
            </Link>
          </div>
        </div>
      </header>

      <section className="px-6 pt-[100px] pb-20 md:px-10">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center text-center">
          <p className="text-[13px] uppercase tracking-[0.1em] text-[#6B7280]">
            VERSION CONTROL FOR AI PROMPTS
          </p>
          <h1
            className={`${nunito.className} mt-4 max-w-[700px] text-[64px] font-bold leading-[1.1] text-[#111111]`}
          >
            The GitHub for AI Prompts.
          </h1>
          <p className="mt-5 max-w-[500px] text-[18px] leading-[1.6] text-[#6B7280]">
            Write, branch, eval, and deploy prompts with version history and a live API endpoint.
          </p>
          <Link
            href="/dashboard"
            className={`${nunito.className} mt-8 inline-flex rounded-[8px] bg-[#111111] px-8 py-[14px] text-[16px] font-bold text-white transition-opacity hover:opacity-90`}
          >
            Get started →
          </Link>
        </div>
      </section>

      <section className="overflow-hidden border-y border-[#E5E7EB] bg-white">
        <div className="mx-auto flex w-full max-w-[1100px] items-center px-6 py-4 md:px-10">
          <div className="marquee-track flex min-w-max items-center">
            {[...badges, ...badges].map((badge, index) => (
              <span
                key={`${badge}-${index}`}
                className="mr-3 inline-flex whitespace-nowrap rounded-full border border-[#E5E7EB] px-5 py-2 text-[14px] text-[#111111]"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-10">
        <div className="mx-auto w-full max-w-[1000px]">
          <p className="mb-12 text-center text-[12px] uppercase tracking-[0.15em] text-[#6B7280]">
            WHY PUPITAR
          </p>

          <div className="grid border-y border-[#E5E7EB] md:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={feature.label}
                className={`py-10 ${index > 0 ? "md:border-l md:border-[#E5E7EB] md:px-8" : "md:pr-8"}`}
              >
                <p className="text-[11px] uppercase tracking-[0.15em] text-[#6B7280]">{feature.label}</p>
                <h2 className={`${nunito.className} mt-4 text-[22px] font-bold text-[#111111]`}>
                  {feature.heading}
                </h2>
                <p className="mt-3 text-[15px] leading-[1.7] text-[#6B7280]">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-10">
        <div className="mx-auto w-full max-w-[1000px]">
          <p className="text-center text-[12px] uppercase tracking-[0.15em] text-[#6B7280]">HOW IT WORKS</p>
          <h2 className={`${nunito.className} mx-auto mt-4 max-w-[760px] text-center text-[42px] font-bold text-[#111111]`}>
            From prompt to production in minutes.
          </h2>

          <div className="mt-14 grid gap-0 md:grid-cols-4">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`py-6 ${index > 0 ? "md:border-l md:border-[#E5E7EB] md:pl-6" : "md:pr-6"}`}
              >
                <div className={`${nunito.className} text-[48px] font-bold leading-none text-[#E5E7EB]`}>
                  {step.number}
                </div>
                <h3 className={`${nunito.className} mt-4 text-[18px] font-bold text-[#111111]`}>
                  {step.heading}
                </h3>
                <p className="mt-3 text-[14px] leading-[1.7] text-[#6B7280]">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#111111] px-6 py-20 text-white md:px-10">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col items-center text-center">
          <h2 className={`${nunito.className} max-w-[720px] text-[42px] font-bold leading-[1.1] text-white`}>
            Start building with confidence.
          </h2>
          <p className="mt-5 max-w-[520px] text-[18px] leading-[1.6] text-[#9CA3AF]">
            Version prompts with branching, evals, and deploys in one place.
          </p>
          <Link
            href="/dashboard"
            className={`${nunito.className} mt-8 inline-flex rounded-[8px] bg-white px-8 py-[14px] text-[16px] font-bold text-[#111111] transition-opacity hover:opacity-90`}
          >
            Get started →
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#E5E7EB] bg-white px-6 py-8 md:px-10">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-4">
          <span className={`${nunito.className} text-[18px] font-bold text-[#111111]`}>Pupitar</span>
          <span className="text-[14px] text-[#6B7280]">Built by Suprith</span>
        </div>
      </footer>
    </main>
  );
}
