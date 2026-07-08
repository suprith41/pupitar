"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const badges = [
  "Branching",
  "Eval-gated merges",
  "Version history",
  "Live API endpoint",
  "Diff view",
  "Playground",
  "Prompt versioning",
  "Deploy in one click",
  "Restore any version",
  "AI eval generation"
];

const features = [
  {
    label: "BRANCHING",
    heading: "Ship without breaking production.",
    body: "Create a branch, experiment freely, merge only when your eval suite passes. Your live prompt stays safe."
  },
  {
    label: "EVALS",
    heading: "Prove every change before it ships.",
    body: "Write test cases or auto-generate them with AI. Run them against any version and see exactly what changed."
  },
  {
    label: "DEPLOY",
    heading: "One click from prompt to live API.",
    body: "Get a real API endpoint for your deployed prompt. Call it from anywhere with an API key."
  }
];

const steps = [
  {
    number: "1",
    heading: "Write",
    body: "Write your system prompt in the editor."
  },
  {
    number: "2",
    heading: "Branch",
    body: "Create a branch to experiment safely."
  },
  {
    number: "3",
    heading: "Eval",
    body: "Run test cases. See pass/fail instantly."
  },
  {
    number: "4",
    heading: "Deploy",
    body: "Ship to a live API endpoint with one click."
  }
];

const faqs = [
  {
    question: "Is this just another PromptLayer?",
    answer:
      "No. PromptLayer logs prompts. Pupitar versions them like Git - with branching, diffs, and eval-gated merges that block bad deploys automatically."
  },
  {
    question: "Do I need to know how to code?",
    answer: "No. If you can write a prompt, you can use Pupitar."
  },
  {
    question: "Is it free?",
    answer: "Free to start. No credit card required."
  },
  {
    question: "What models does it support?",
    answer: "Any model via Groq - llama-3.3-70b, llama-3.1-8b, and more coming soon."
  }
];

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 8);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="min-h-screen bg-bg text-ink">
      <style>{`
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        @keyframes scroll-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }

        .marquee-left {
          animation: scroll-left 25s linear infinite;
        }

        .marquee-right {
          animation: scroll-right 25s linear infinite;
        }

        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-up {
          animation: fade-up 0.7s ease-out both;
        }

        .animate-fade-up-delay-1 {
          animation: fade-up 0.7s ease-out 0.15s both;
        }

        .animate-fade-up-delay-2 {
          animation: fade-up 0.7s ease-out 0.3s both;
        }
      `}</style>

      {/* Navigation - Dark nav inspired by Root Fifteen */}
      <header
        className={`sticky top-0 z-30 w-full bg-nav transition-shadow ${
          isScrolled ? "shadow-elevated" : ""
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="text-[18px] font-extrabold tracking-[-0.04em] text-white uppercase">
            Pupitar
          </Link>

          <nav className="flex items-center gap-8">
            <a href="#features" className="text-[14px] font-medium text-white/70 transition-colors hover:text-white">
              Features
            </a>
            <a href="#how-it-works" className="text-[14px] font-medium text-white/70 transition-colors hover:text-white">
              How it works
            </a>
            <a href="#faqs" className="text-[14px] font-medium text-white/70 transition-colors hover:text-white">
              FAQs
            </a>
          </nav>

          <Link
            href="/dashboard"
            className="rounded-pill bg-accent px-[22px] py-2.5 text-[14px] font-bold text-white shadow-blue transition-all hover:bg-accent-hover hover:shadow-lg"
          >
            Get started →
          </Link>
        </div>
      </header>

      {/* Hero - Blue section inspired by ZFellows + Root Fifteen */}
      <section className="bg-accent px-6 pb-20 pt-20 md:px-10 md:pb-28 md:pt-28">
        <div className="mx-auto w-full max-w-[1100px]">
          <div className="animate-fade-up">
            <span className="inline-flex items-center rounded-pill border border-white/30 bg-white/10 px-4 py-1.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
              Version Control for Prompts
            </span>
          </div>
          <h1 className="animate-fade-up-delay-1 mt-6 max-w-[700px] text-[64px] font-black leading-[1.05] tracking-[-0.04em] text-white md:text-[80px]">
            The GitHub
            <br />
            for AI Prompts.
          </h1>
          <p className="animate-fade-up-delay-2 mt-6 max-w-[500px] text-[18px] leading-[1.6] font-medium text-white/80">
            Version control, branching, and eval-gated deploys for prompts and AI agents.
          </p>
          <Link
            href="/dashboard"
            className="animate-fade-up-delay-2 mt-8 inline-flex rounded-pill bg-white px-[28px] py-3.5 text-[15px] font-bold text-ink shadow-card transition-all hover:shadow-elevated hover:scale-[1.02]"
          >
            Get started →
          </Link>
        </div>
      </section>

      {/* Marquee badges */}
      <section className="overflow-hidden border-b border-line bg-bg py-5">
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden">
            <div className="marquee-left flex w-max items-center">
              {[...badges, ...badges].map((badge, index) => (
                <span
                  key={`left-${badge}-${index}`}
                  className="mr-3 whitespace-nowrap rounded-pill border border-line bg-surface px-5 py-2 text-[13px] font-medium text-ink shadow-subtle"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
          <div className="overflow-hidden">
            <div className="marquee-right flex w-max items-center">
              {[...badges, ...badges].map((badge, index) => (
                <span
                  key={`right-${badge}-${index}`}
                  className="mr-3 whitespace-nowrap rounded-pill border border-line bg-surface px-5 py-2 text-[13px] font-medium text-ink shadow-subtle"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pattern section - inspired by ZFellows text section */}
      <section className="px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto max-w-[900px]">
          <h2 className="text-[42px] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink md:text-[52px]">
            There&apos;s a pattern among the best AI builders.
          </h2>
          <p className="mt-6 max-w-[600px] text-[18px] leading-[1.7] text-muted">
            They all version-controlled their prompts. They tested before deploying. They treated prompts like code.
          </p>
          <p className="mt-8 max-w-[760px] text-[28px] italic font-light leading-[1.4] text-ink/70 md:text-[32px]" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
            &ldquo;Success leaves clues — follow them.&rdquo;
          </p>
        </div>
      </section>

      {/* Features - Card style inspired by Root Fifteen */}
      <section id="features" className="px-6 pb-20 md:px-10 md:pb-28">
        <div className="mx-auto w-full max-w-[1100px]">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.label}
                className="rounded-xl border-2 border-ink/10 bg-surface p-8 shadow-card transition-all hover:border-accent/30 hover:shadow-elevated"
              >
                <span className="inline-flex rounded-pill bg-nav px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                  {feature.label}
                </span>
                <h3 className="mt-5 text-[22px] font-extrabold leading-[1.2] tracking-[-0.02em] text-ink">
                  {feature.heading}
                </h3>
                <p className="mt-3 text-[15px] leading-[1.7] text-muted">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-nav px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto w-full max-w-[1000px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/50">How it works</span>
          <h2 className="mt-4 max-w-[720px] text-[42px] font-extrabold leading-[1.1] tracking-[-0.03em] text-white md:text-[52px]">
            From idea to production in minutes.
          </h2>

          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {steps.map((step) => (
              <div key={step.number} className="relative border-t border-white/15 pt-8">
                <div className="text-[64px] font-black leading-none text-white/10">
                  {step.number}
                </div>
                <h3 className="mt-3 text-[20px] font-bold text-white">
                  {step.heading}
                </h3>
                <p className="mt-3 max-w-[320px] text-[15px] leading-[1.7] text-white/60">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section id="faqs" className="px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto w-full max-w-[800px]">
          <h2 className="text-[42px] font-extrabold tracking-[-0.03em] text-ink">FAQs</h2>
          <div className="mt-8 border-t border-line">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;

              return (
                <div key={faq.question} className="border-b border-line">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 py-6 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-[17px] font-semibold text-ink">
                      {faq.question}
                    </span>
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-[18px] font-bold text-ink transition-transform ${
                        isOpen ? "rotate-45" : ""
                      }`}
                    >
                      +
                    </span>
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isOpen ? "max-h-40 pb-6" : "max-h-0"
                    }`}
                  >
                    <p className="pr-8 text-[15px] leading-[1.7] text-muted">{faq.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA section - Blue like ZFellows */}
      <section className="bg-accent px-6 py-20 md:px-10 md:py-28">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col items-center text-center">
          <h2 className="max-w-[700px] text-[48px] font-black leading-[1.1] tracking-[-0.03em] text-white md:text-[56px]">
            When in doubt, ship it.
          </h2>
          <p className="mt-6 max-w-[520px] text-[18px] leading-[1.6] font-medium text-white/80">
            Start versioning prompts with confidence, branching, evals, and deploys.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex rounded-pill bg-white px-[28px] py-3.5 text-[15px] font-bold text-ink shadow-card transition-all hover:shadow-elevated hover:scale-[1.02]"
          >
            Get started →
          </Link>
        </div>
      </section>

      {/* Footer - Dark like Root Fifteen nav */}
      <footer className="bg-nav px-6 py-8 md:px-10">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <span className="text-[16px] font-extrabold uppercase tracking-[-0.02em] text-white">Pupitar</span>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="flex flex-wrap items-center gap-6 text-[14px] font-medium text-white/50">
              <a href="#features" className="transition-colors hover:text-white">
                Features
              </a>
              <a href="#how-it-works" className="transition-colors hover:text-white">
                How it works
              </a>
              <a href="#faqs" className="transition-colors hover:text-white">
                FAQs
              </a>
            </div>
            <p className="text-[12px] text-white/40">Built by Suprith</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
