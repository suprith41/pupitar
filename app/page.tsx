"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DM_Sans, Source_Serif_4 } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap"
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
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
    <main className={`${sourceSerif.className} min-h-screen bg-white text-[#111111]`}>
      <style>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @keyframes scroll-right {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }

        .marquee-left {
          animation: scroll-left 25s linear infinite;
        }

        .marquee-right {
          animation: scroll-right 25s linear infinite;
        }

        ::selection {
          background: #111111;
          color: #ffffff;
        }
      `}</style>

      <header
        className={`sticky top-0 z-30 w-full bg-white transition-shadow ${
          isScrolled ? "shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : ""
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-6 py-6 md:px-10">
          <Link href="/" className={`${dmSans.className} text-[16px] font-bold text-[#111111]`}>
            Pupitar
          </Link>

          <nav className="flex items-center gap-8">
            <a href="#features" className="text-[14px] text-[#111111] transition-colors hover:text-[#555555]">
              Features
            </a>
            <a href="#how-it-works" className="text-[14px] text-[#111111] transition-colors hover:text-[#555555]">
              How it works
            </a>
            <a href="#faqs" className="text-[14px] text-[#111111] transition-colors hover:text-[#555555]">
              FAQs
            </a>
          </nav>

          <Link
            href="/dashboard"
            className={`${dmSans.className} rounded-[6px] bg-[#111111] px-[18px] py-2 text-[14px] font-bold text-white transition-opacity hover:opacity-90`}
          >
            Get started →
          </Link>
        </div>
      </header>

      <section className="px-6 pb-20 pt-20 md:px-10 md:pb-24 md:pt-24">
        <div className="mx-auto w-full max-w-[1100px]">
          <p className="text-[14px] italic font-light text-[#555555]">Write once. Ship with confidence.</p>
          <h1 className={`${dmSans.className} mt-4 max-w-[700px] text-[72px] font-bold leading-[1.05] tracking-[-0.02em] text-[#111111]`}>
            The GitHub
            <br />
            for AI Prompts.
          </h1>
          <p className="mt-5 max-w-[480px] text-[18px] leading-[1.6] text-[#555555]">
            Version control, branching, and eval-gated deploys for prompts and AI agents.
          </p>
          <Link
            href="/dashboard"
            className={`${dmSans.className} mt-8 inline-flex rounded-[6px] bg-[#111111] px-[28px] py-3 text-[15px] font-bold text-white transition-opacity hover:opacity-90`}
          >
            Get started →
          </Link>
        </div>
      </section>

      <section className="overflow-hidden border-y border-[#E5E7EB] bg-white py-4">
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden">
            <div className="marquee-left flex w-max items-center">
              {[...badges, ...badges].map((badge, index) => (
                <span
                  key={`left-${badge}-${index}`}
                  className="mr-3 whitespace-nowrap rounded-full border border-[#E5E7EB] bg-white px-5 py-2 text-[13px] text-[#111111]"
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
                  className="mr-3 whitespace-nowrap rounded-full border border-[#E5E7EB] bg-white px-5 py-2 text-[13px] text-[#111111]"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto max-w-[900px]">
          <h2 className={`${dmSans.className} text-[42px] font-bold leading-[1.1] text-[#111111]`}>
            There&apos;s a pattern among the best AI builders.
          </h2>
          <p className="mt-5 max-w-[600px] text-[18px] leading-[1.6] text-[#555555]">
            They all version-controlled their prompts. They tested before deploying. They treated prompts like code.
          </p>
          <p className={`${sourceSerif.className} mt-8 max-w-[760px] text-[32px] italic font-light leading-[1.3] text-[#111111]`}>
            “Success leaves clues - follow them.”
          </p>
        </div>
      </section>

      <section id="features" className="px-6 pb-20 md:px-10 md:pb-24">
        <div className="mx-auto grid w-full max-w-[1100px] border-y border-[#E5E7EB] md:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.label}
              className={`px-0 py-8 md:px-10 ${index > 0 ? "md:border-l md:border-[#E5E7EB]" : ""}`}
            >
              <p className="mb-3 text-[11px] uppercase tracking-[0.12em] text-[#555555]">{feature.label}</p>
              <h3 className={`${dmSans.className} mb-3 text-[24px] font-bold text-[#111111]`}>
                {feature.heading}
              </h3>
              <p className="text-[16px] leading-[1.7] text-[#555555]">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="bg-[#F9FAFB] px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto w-full max-w-[1000px]">
          <p className="text-[11px] uppercase tracking-[0.15em] text-[#555555]">How it works</p>
          <h2 className={`${dmSans.className} mt-4 max-w-[720px] text-[48px] font-bold leading-[1.1] text-[#111111]`}>
            From idea to production in minutes.
          </h2>

          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {steps.map((step) => (
              <div key={step.number} className="relative border-t border-[#E5E7EB] pt-8">
                <div className={`${dmSans.className} text-[64px] font-bold leading-none text-[#E5E7EB]`}>
                  {step.number}
                </div>
                <h3 className={`${dmSans.className} mt-3 text-[20px] font-bold text-[#111111]`}>
                  {step.heading}
                </h3>
                <p className="mt-3 max-w-[320px] text-[15px] leading-[1.7] text-[#555555]">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faqs" className="px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto w-full max-w-[800px]">
          <h2 className={`${dmSans.className} text-[42px] font-bold text-[#111111]`}>FAQs</h2>
          <div className="mt-8 border-t border-[#E5E7EB]">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;

              return (
                <div key={faq.question} className="border-b border-[#E5E7EB]">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className={`${dmSans.className} text-[17px] font-medium text-[#111111]`}>
                      {faq.question}
                    </span>
                    <span className={`${dmSans.className} text-[24px] font-bold text-[#111111]`}>
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen ? (
                    <p className="pb-5 pr-8 text-[15px] leading-[1.7] text-[#555555]">{faq.answer}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto flex w-full max-w-[1000px] flex-col items-center text-center">
          <h2 className={`${dmSans.className} max-w-[700px] text-[52px] font-bold leading-[1.1] text-[#111111]`}>
            When in doubt, ship it.
          </h2>
          <p className="mt-5 max-w-[520px] text-[18px] leading-[1.6] text-[#555555]">
            Start versioning prompts with confidence, branching, evals, and deploys.
          </p>
          <Link
            href="/dashboard"
            className={`${dmSans.className} mt-8 inline-flex rounded-[6px] bg-[#111111] px-[28px] py-3 text-[15px] font-bold text-white transition-opacity hover:opacity-90`}
          >
            Get started →
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#E5E7EB] bg-white px-6 py-8 md:px-10">
        <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <span className={`${dmSans.className} text-[16px] font-bold text-[#111111]`}>Pupitar</span>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="flex flex-wrap items-center gap-6 text-[14px] text-[#555555]">
              <a href="#features" className="transition-colors hover:text-[#111111]">
                Features
              </a>
              <a href="#how-it-works" className="transition-colors hover:text-[#111111]">
                How it works
              </a>
              <a href="#faqs" className="transition-colors hover:text-[#111111]">
                FAQs
              </a>
            </div>
            <p className="text-[12px] text-[#555555]">Built by Suprith</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
