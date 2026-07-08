"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const heroTiles = [
  { title: "prompt.md", meta: "main", tone: "bg-accent text-white" },
  { title: "evals", meta: "12 passing", tone: "bg-white text-ink" },
  { title: "branch", meta: "checkout safer-copy", tone: "bg-[#eaf1fb] text-ink" },
  { title: "diff", meta: "+ clearer tone", tone: "bg-white text-ink" },
  { title: "deploy", meta: "live endpoint", tone: "bg-accent text-white" },
  { title: "history", meta: "restore v08", tone: "bg-panel text-ink" }
];

const proofCards = [
  {
    title: "Every serious AI team creates versions.",
    body: "Prompt changes are product changes. Pupitar keeps every experiment visible, reversible, and ready to compare."
  },
  {
    title: "The best builders test before they ship.",
    body: "Run evals against any prompt version and merge only when the behavior earns its way into production."
  },
  {
    title: "Shipping should feel calm.",
    body: "Deploy the approved prompt to a live endpoint without losing the trail of what changed and why."
  }
];

const whyCards = [
  {
    quote: "I want to try a risky prompt without touching production.",
    answer: "Create a branch, edit freely, then compare the result against main."
  },
  {
    quote: "I need proof this prompt still behaves.",
    answer: "Generate or write eval cases and see pass/fail results before merging."
  },
  {
    quote: "I shipped something worse and need to go back.",
    answer: "Open history, inspect the diff, and restore a known-good version."
  }
];

const programSteps = [
  "Write the system prompt in a clean editor.",
  "Branch when you want to explore a new direction.",
  "Run evals to catch regressions before they reach users.",
  "Deploy the winning version as a live API endpoint."
];

const faqItems = [
  {
    question: "Is Pupitar only for engineers?",
    answer: "No. If you can write a prompt, you can create versions, run evals, and deploy from Pupitar."
  },
  {
    question: "How is this different from a prompt log?",
    answer: "Logs show what happened. Pupitar lets you branch, compare, test, merge, restore, and deploy prompts like product assets."
  },
  {
    question: "Can I test prompt changes before shipping?",
    answer: "Yes. Pupitar is built around eval-gated changes, so a version can prove itself before it becomes live."
  },
  {
    question: "Can I restore an older prompt?",
    answer: "Yes. Version history and diffs are core to the product, so you can return to a known-good prompt quickly."
  }
];

function ProductTile({
  title,
  meta,
  tone,
  index
}: {
  title: string;
  meta: string;
  tone: string;
  index: number;
}) {
  return (
    <div
      className={`zf-image-card min-h-[150px] rounded-[18px] border border-line p-5 shadow-zf ${tone}`}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="flex h-full flex-col justify-between gap-8">
        <p className="font-mono text-[12px] uppercase tracking-[0.16em] opacity-60">{meta}</p>
        <h3 className="text-[30px] leading-[1] tracking-[-0.02em]">{title}</h3>
      </div>
    </div>
  );
}

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 10);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-bg text-ink">
      <header
        className={`sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur-md transition-shadow duration-300 ${
          isScrolled ? "shadow-zf" : ""
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-5 px-5 py-4 md:px-8">
          <Link href="/" className="text-[22px] font-bold tracking-[-0.02em] text-accent">
            Pupitar
          </Link>

          <nav className="hidden items-center gap-8 text-[17px] text-[#363636] md:flex">
            <a className="zf-link" href="#about">
              About
            </a>
            <a className="zf-link" href="#program">
              Program
            </a>
            <a className="zf-link" href="#faqs">
              FAQs
            </a>
          </nav>

          <Link href="/dashboard" className="zf-button text-[16px]">
            Open Pupitar
          </Link>
        </div>
      </header>

      <section className="px-5 pb-14 pt-16 md:px-8 md:pb-20 md:pt-24">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col items-center text-center">
          <p className="zf-reveal text-[22px] font-bold uppercase leading-none text-accent md:text-[28px]">
            1 prompt. Every version.
          </p>
          <h1 className="zf-reveal mt-5 max-w-[920px] text-[58px] leading-[0.92] tracking-[-0.04em] md:text-[104px]">
            Your Fast-Track Into <span className="text-accent">Reliable AI Prompts.</span>
          </h1>
          <p className="zf-reveal mt-7 max-w-[640px] text-[22px] leading-[1.45] text-[#363636] md:text-[28px]">
            Version control, evals, branching, and live deploys for prompts your users depend on.
          </p>
          <Link href="/dashboard" className="zf-button zf-reveal mt-8 text-[18px]">
            Start building
          </Link>
        </div>
      </section>

      <section aria-label="Pupitar product preview" className="px-5 pb-20 md:px-8">
        <div className="mx-auto grid w-full max-w-[1180px] grid-cols-2 gap-3 md:grid-cols-6 md:gap-4">
          {heroTiles.map((tile, index) => (
            <ProductTile key={tile.title} {...tile} index={index} />
          ))}
        </div>
      </section>

      <section id="about" className="relative px-5 py-20 md:px-8 md:py-28">
        <div className="pointer-events-none absolute left-1/2 top-8 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-[#75a9ff33] blur-3xl" />
        <div className="mx-auto max-w-[980px] text-center">
          <h2 className="zf-reveal relative text-[44px] leading-[1.03] tracking-[-0.035em] md:text-[76px]">
            There&apos;s a pattern among the <span className="text-accent">best AI builders.</span>
          </h2>
          <div className="relative mx-auto mt-8 max-w-[760px] space-y-4 text-[21px] leading-[1.55] text-[#363636] md:text-[26px]">
            <p>They treat prompts like code.</p>
            <p>They test changes before users feel them.</p>
            <p className="text-ink">Success leaves clues. Follow them.</p>
          </div>
        </div>

        <div className="relative mx-auto mt-14 grid w-full max-w-[1080px] gap-5 md:grid-cols-3">
          {proofCards.map((card) => (
            <article key={card.title} className="zf-card">
              <h3 className="text-[26px] leading-[1.08] tracking-[-0.02em]">{card.title}</h3>
              <p className="mt-5 text-[18px] leading-[1.55] text-ink/66">{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-accent px-5 py-20 text-white md:px-8 md:py-28">
        <div className="mx-auto max-w-[1080px] text-center">
          <h2 className="text-[48px] leading-[0.98] tracking-[-0.035em] md:text-[82px]">
            Pupitar connects early AI builders with production-grade prompt workflows.
          </h2>
          <div className="mx-auto mt-8 max-w-[760px] space-y-5 text-[21px] leading-[1.55] text-white/85 md:text-[25px]">
            <p>Pupitar is for people turning prompts into real product behavior.</p>
            <p>It gives you the confidence loop: create, compare, evaluate, merge, deploy, and restore.</p>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-[1180px]">
          <h2 className="max-w-[520px] text-[52px] leading-[0.95] tracking-[-0.035em] md:text-[92px]">
            Why <span className="text-accent">Pupitar?</span>
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {whyCards.map((card) => (
              <article key={card.quote} className="zf-card group">
                <p className="text-[24px] leading-[1.15] tracking-[-0.015em]">&ldquo;{card.quote}&rdquo;</p>
                <p className="mt-8 border-t border-ink/12 pt-5 text-[18px] leading-[1.5] text-ink/68">
                  {card.answer}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="program" className="bg-panel px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-[1080px] gap-8 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="inline-flex rounded-full border border-accent/20 bg-white px-4 py-2 text-[13px] font-bold uppercase tracking-[0.18em] text-accent">
              About the program
            </p>
            <h2 className="mt-5 text-[48px] leading-[1] tracking-[-0.035em] md:text-[78px]">
              A short path from prompt idea to live endpoint.
            </h2>
          </div>
          <div className="grid gap-3">
            {programSteps.map((step, index) => (
              <div key={step} className="zf-row">
                <span className="font-mono text-[13px] text-ink/42">0{index + 1}</span>
                <p className="text-[21px] leading-[1.35] md:text-[26px]">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faqs" className="bg-bg px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-[1080px] gap-10 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-[56px] leading-none tracking-[-0.035em] md:text-[96px]">FAQs</h2>
            <p className="mt-6 max-w-sm text-[21px] leading-[1.45] text-[#363636]">
              The practical questions before you trust a prompt workflow with production.
            </p>
          </div>

          <div className="border-t border-line">
            {faqItems.map((faq, index) => {
              const isOpen = openFaq === index;

              return (
                <div key={faq.question} className="border-b border-line">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="group flex w-full items-center justify-between gap-6 py-6 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="text-[23px] leading-[1.2] md:text-[28px]">{faq.question}</span>
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-[24px] transition-all duration-300 group-hover:border-accent group-hover:bg-accent group-hover:text-white ${
                        isOpen ? "rotate-45 border-accent bg-accent text-white" : ""
                      }`}
                    >
                      +
                    </span>
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-6 pr-12 text-[19px] leading-[1.55] text-[#706e6e]">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-accent px-5 py-20 text-white md:px-8 md:py-28">
        <div className="mx-auto flex max-w-[980px] flex-col items-center text-center">
          <h2 className="text-[56px] leading-[0.95] tracking-[-0.04em] md:text-[104px]">
            When in doubt, version it.
          </h2>
          <p className="mt-6 text-[24px] leading-[1.35] text-white/85 md:text-[32px]">We&apos;re all iterating.</p>
          <Link href="/dashboard" className="zf-button is-secondary mt-9 text-[18px]">
            Open Pupitar
          </Link>
        </div>
      </section>

      <footer className="border-t border-line bg-white px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-5 text-[18px] text-[#363636] md:flex-row md:items-center md:justify-between">
          <Link href="/" className="font-bold text-accent">
            Pupitar
          </Link>
          <div className="flex flex-wrap gap-6">
            <a className="zf-link" href="#about">
              About
            </a>
            <a className="zf-link" href="#program">
              Program
            </a>
            <a className="zf-link" href="#faqs">
              FAQs
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
