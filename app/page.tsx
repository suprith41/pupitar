"use client";

import { createBrowserClient } from "@supabase/ssr";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseConfig } from "@/lib/supabase/env";
import { PupitarLogo } from "@/components/logo";

const features = [
  {
    eyebrow: "Version with intent",
    title: "Every prompt change has a history.",
    body: "Branch risky ideas, compare exact changes, and restore a known-good version without losing the reasoning behind it.",
    points: ["Branch without touching production", "Readable prompt diffs", "Release labels and rollback"],
    illustration: "versions" as const
  },
  {
    eyebrow: "Evaluate before merge",
    title: "Quality becomes a release gate.",
    body: "Attach real test cases to the repo and compare behavior across versions before a prompt reaches your users.",
    points: ["Reusable evaluation suites", "Version-to-version scores", "Regression visibility"],
    illustration: "evals" as const
  },
  {
    eyebrow: "Deploy with confidence",
    title: "The approved prompt ships as an endpoint.",
    body: "Move from a reviewed version to a live API without separating production behavior from its source and history.",
    points: ["Stable API endpoint", "Traceable deployed version", "Request and latency logs"],
    illustration: "deploy" as const
  }
];

const workflow = [
  ["01", "Write", "Create the system prompt in a focused editor."],
  ["02", "Branch", "Explore a new direction without changing main."],
  ["03", "Evaluate", "Prove the change against repeatable test cases."],
  ["04", "Deploy", "Ship the approved version to a live endpoint."]
] as const;

const faqItems = [
  {
    question: "Is Pupitar only for engineers?",
    answer: "No. Anyone who can write and review a prompt can create versions, run evaluations, and manage releases in Pupitar."
  },
  {
    question: "How is this different from saving prompt history?",
    answer: "History records changes. Pupitar adds branches, structured diffs, evaluations, release labels, rollback, deployment, and production logs around those changes."
  },
  {
    question: "Can prompt changes be tested before shipping?",
    answer: "Yes. Evaluation cases live with the repo, so a new version can be measured and compared before it becomes the deployed version."
  },
  {
    question: "Can I recover an older production prompt?",
    answer: "Yes. Every committed version remains available, making it straightforward to inspect and restore a known-good prompt."
  }
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="m3.5 8 3 3 6-7" />
    </svg>
  );
}

function ProductDemo() {
  return (
    <div className="landing-product-frame" aria-label="Pupitar prompt repository interface preview">
      <div className="landing-product-bar">
        <div className="flex items-center gap-1.5"><span /><span /><span /></div>
        <div className="font-mono text-[10px] tracking-[0.12em] text-[#667085]">ACME / SUPPORT-AGENT</div>
        <div className="flex items-center gap-2 text-[10px] text-[#667085]"><i className="landing-live-dot" /> SAVED</div>
      </div>

      <div className="landing-product-body">
        <aside className="landing-demo-sidebar">
          <p className="landing-demo-label">Versions</p>
          <div className="landing-demo-version is-active"><span>v12</span><b>main</b></div>
          <div className="landing-demo-version"><span>v11</span><b>stable</b></div>
          <div className="landing-demo-version"><span>v10</span><b>tone-fix</b></div>
          <div className="landing-demo-branch">
            <i /><span /> safer-refunds
          </div>
        </aside>

        <div className="landing-demo-editor">
          <div className="landing-demo-editor-head">
            <div><b>prompt.md</b><span> · main</span></div>
            <div className="landing-demo-commit">Commit changes</div>
          </div>
          <div className="landing-demo-code">
            <p><em>01</em><span className="text-[#7aa7ff]"># Role</span></p>
            <p><em>02</em>You are Acme&apos;s customer support assistant.</p>
            <p><em>03</em></p>
            <p><em>04</em><span className="text-[#7aa7ff]"># Instructions</span></p>
            <p><em>05</em>Resolve the request clearly and accurately.</p>
            <p className="landing-demo-highlight"><em>06</em>Confirm account details before taking action.</p>
            <p><em>07</em>Escalate when confidence is below the threshold.</p>
            <p><em>08</em><i className="landing-demo-caret" /></p>
          </div>
          <div className="landing-demo-diff">
            <span>+ safer account verification</span>
            <b>3 additions</b>
          </div>
        </div>

        <aside className="landing-demo-inspector">
          <p className="landing-demo-label">Release check</p>
          <div className="landing-demo-score"><strong>12/12</strong><span>evals passing</span></div>
          <div className="landing-demo-progress"><i /></div>
          <div className="landing-demo-check"><CheckIcon /><span>Accuracy</span><b>100%</b></div>
          <div className="landing-demo-check"><CheckIcon /><span>Safety</span><b>100%</b></div>
          <div className="landing-demo-check"><CheckIcon /><span>Tone</span><b>96%</b></div>
          <button type="button" tabIndex={-1}>Ready to deploy <ArrowIcon /></button>
        </aside>
      </div>
    </div>
  );
}

function FeatureIllustration({ kind }: { kind: "versions" | "evals" | "deploy" }) {
  return (
    <div className={`landing-feature-visual landing-feature-${kind}`} aria-hidden="true">
      {kind === "versions" ? (
        <svg viewBox="0 0 520 360" fill="none">
          <path className="landing-draw-path" d="M106 76v206M106 128h122c42 0 54 30 54 58v58c0 26 18 42 48 42h78" />
          <circle cx="106" cy="76" r="14" /><circle cx="106" cy="128" r="10" /><circle cx="106" cy="218" r="10" /><circle cx="106" cy="282" r="14" />
          <circle cx="408" cy="286" r="14" />
          <rect x="144" y="54" width="236" height="55" rx="14" /><rect x="144" y="190" width="178" height="55" rx="14" />
          <path d="M168 76h82M168 88h132M168 212h74M168 224h104" />
          <rect className="landing-svg-accent" x="330" y="67" width="32" height="20" rx="10" />
        </svg>
      ) : null}
      {kind === "evals" ? (
        <svg viewBox="0 0 520 360" fill="none">
          <rect x="72" y="54" width="376" height="252" rx="20" />
          <path d="M72 106h376M320 106v200" />
          <circle cx="98" cy="80" r="5" /><circle cx="116" cy="80" r="5" /><circle cx="134" cy="80" r="5" />
          <path d="M102 145h112M102 185h142M102 225h96M102 265h124" />
          <circle className="landing-svg-success" cx="358" cy="145" r="12" /><circle className="landing-svg-success" cx="358" cy="185" r="12" /><circle className="landing-svg-success" cx="358" cy="225" r="12" />
          <path className="landing-svg-check" d="m352 145 4 4 8-9M352 185l4 4 8-9M352 225l4 4 8-9" />
          <rect className="landing-svg-soft" x="338" y="254" width="82" height="24" rx="12" />
        </svg>
      ) : null}
      {kind === "deploy" ? (
        <svg viewBox="0 0 520 360" fill="none">
          <rect x="68" y="64" width="384" height="230" rx="20" />
          <path d="M68 112h384" />
          <circle cx="96" cy="88" r="5" /><circle cx="114" cy="88" r="5" /><circle cx="132" cy="88" r="5" />
          <rect x="100" y="146" width="318" height="48" rx="12" />
          <rect className="landing-svg-accent" x="114" y="158" width="48" height="24" rx="8" />
          <path d="M180 170h178" />
          <path d="m120 232 15 14-15 14M150 260h82" />
          <circle className="landing-svg-success" cx="388" cy="246" r="20" />
          <path className="landing-svg-check" d="m379 246 6 6 12-14" />
        </svg>
      ) : null}
    </div>
  );
}

function getEmailInitial(email: string | null) {
  return email?.trim().charAt(0).toUpperCase() || "U";
}

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-landing-reveal]"));
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      setHasCheckedSession(true);
      return;
    }
    const supabase = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
    let active = true;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) {
        setSessionEmail(session?.user.email ?? null);
        setHasCheckedSession(true);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null);
      setHasCheckedSession(true);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const primaryHref = sessionEmail ? "/dashboard" : "/signup";

  return (
    <main className="landing-page min-h-screen overflow-hidden bg-[#f6f7f9] text-[#10141c]">
      <section className="landing-hero relative overflow-hidden bg-[#f8faff] text-[#111827]">
        <div className="landing-hero-cityscape" aria-hidden="true">
          <Image
            src="/hero-cityscape-pixel.jpg"
            alt=""
            fill
            priority
            quality={100}
            sizes="100vw"
            unoptimized
          />
        </div>
        <header className={`landing-header sticky top-0 z-50 transition-all duration-200 ${isScrolled ? "is-scrolled" : ""}`}>
          <div className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center justify-between px-5 md:px-8">
            <Link href="/" className="flex items-center gap-2.5 text-[22px] font-bold tracking-[-0.03em] text-[#111827]">
              <PupitarLogo size={30} /> Pupitar
            </Link>
            <nav className="hidden items-center gap-7 text-[14px] font-medium text-[#667085] md:flex">
              <a href="#product" className="landing-nav-link">Product</a>
              <a href="#workflow" className="landing-nav-link">How it works</a>
              <Link href="/explore" className="landing-nav-link">Explore</Link>
              <a href="#faqs" className="landing-nav-link">FAQs</a>
            </nav>
            <div className="flex items-center gap-3">
              {hasCheckedSession && sessionEmail ? (
                <>
                  <Link href="/dashboard" className="hidden text-[14px] font-semibold text-[#475467] transition-colors hover:text-[#2067ff] sm:block">Dashboard</Link>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2067ff] text-[12px] font-bold text-white" title={sessionEmail}>{getEmailInitial(sessionEmail)}</div>
                </>
              ) : (
                <>
                  <Link href="/login" className="hidden text-[14px] font-semibold text-[#475467] transition-colors hover:text-[#2067ff] sm:block">Log in</Link>
                  <Link href="/signup" className="landing-header-cta">Start building</Link>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="landing-hero-content relative z-10 mx-auto w-full max-w-[1200px] px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto max-w-[900px] text-center">
            <div className="landing-hero-kicker mx-auto"><span /> Version control for production prompts</div>
            <h1 className="landing-hero-title mt-7 text-[44px] font-bold leading-[1.02] tracking-[-0.05em] md:text-[68px] lg:text-[76px]">
              The unified workspace for<br /><span>prompt engineers.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-[660px] text-[18px] leading-[1.6] text-white md:text-[21px]">
              Branch, evaluate, review, and deploy AI prompts with the discipline you already bring to code.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={primaryHref} className="landing-primary-cta">Start building <ArrowIcon /></Link>
              <Link href="/explore" className="landing-secondary-cta">Explore public repos</Link>
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-white">Branch instantly · Deploy securely</p>
          </div>

        </div>
      </section>

      <section className="landing-product-showcase px-5 md:px-8">
        <div className="landing-product-stage mx-auto max-w-[1200px]" data-landing-reveal>
          <ProductDemo />
        </div>
      </section>

      <section className="border-b border-[#dfe3ea] bg-white px-5 md:px-8">
        <div className="mx-auto grid max-w-[1200px] divide-y divide-[#e2e5eb] md:grid-cols-3 md:divide-x md:divide-y-0">
          {[['Version every decision', 'Branches, diffs, and rollback'], ['Evaluate every release', 'Repeatable quality checks'], ['Trace every deployment', 'Versions connected to production']].map(([title, body]) => (
            <div key={title} className="px-3 py-7 md:px-8 md:py-9 first:md:pl-0 last:md:pr-0">
              <p className="text-[14px] font-bold tracking-[-0.01em] text-[#171b23]">{title}</p>
              <p className="mt-1 text-[13px] text-[#697180]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="product" className="px-5 py-24 md:px-8 md:py-36">
        <div className="mx-auto max-w-[1120px]">
          <div className="max-w-[720px]" data-landing-reveal>
            <p className="landing-section-kicker">The prompt repository</p>
            <h2 className="mt-5 text-[42px] font-bold leading-[1.04] tracking-[-0.045em] md:text-[68px]">One source of truth from first draft to production.</h2>
            <p className="mt-6 max-w-[620px] text-[18px] leading-[1.65] text-[#626a78]">Pupitar keeps the prompt, the reasoning, the tests, and the deployed behavior in the same continuous workflow.</p>
          </div>

          <div className="mt-24 space-y-28 md:mt-32 md:space-y-40">
            {features.map((feature, index) => (
              <article key={feature.title} className={`grid items-center gap-12 md:grid-cols-2 md:gap-20 ${index % 2 ? "" : ""}`} data-landing-reveal>
                <div className={index % 2 ? "md:order-2" : ""}>
                  <p className="landing-section-kicker">{feature.eyebrow}</p>
                  <h3 className="mt-5 text-[36px] font-bold leading-[1.08] tracking-[-0.04em] md:text-[52px]">{feature.title}</h3>
                  <p className="mt-6 text-[17px] leading-[1.7] text-[#626a78]">{feature.body}</p>
                  <ul className="mt-8 space-y-3">
                    {feature.points.map((point) => <li key={point} className="flex items-center gap-3 text-[14px] font-semibold text-[#2f3540]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8f0ff] text-[#2067ff]"><CheckIcon /></span>{point}</li>)}
                  </ul>
                </div>
                <div className={index % 2 ? "md:order-1" : ""}><FeatureIllustration kind={feature.illustration} /></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="border-y border-[#dce5f3] bg-[#eef4ff] px-5 py-24 text-[#111827] md:px-8 md:py-32">
        <div className="mx-auto max-w-[1120px]">
          <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-end" data-landing-reveal>
            <div><p className="landing-section-kicker is-dark">A calm release path</p><h2 className="mt-5 text-[42px] font-bold leading-[1.04] tracking-[-0.045em] md:text-[64px]">From idea to endpoint.</h2></div>
            <p className="max-w-[520px] text-[18px] leading-[1.65] text-[#667085] md:justify-self-end">A short, explicit workflow keeps experimentation fast without making production unpredictable.</p>
          </div>
          <div className="landing-workflow mt-16 grid gap-0 md:grid-cols-4" data-landing-reveal>
            {workflow.map(([number, title, body]) => (
              <div key={number} className="landing-workflow-step">
                <span>{number}</span><i />
                <h3>{title}</h3><p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-24 md:px-8 md:py-32">
        <div className="landing-explore-card mx-auto grid max-w-[1120px] gap-10 overflow-hidden md:grid-cols-[1fr_0.85fr] md:items-center" data-landing-reveal>
          <div className="relative z-10">
            <p className="landing-section-kicker is-dark">Public discovery</p>
            <h2 className="mt-5 text-[40px] font-bold leading-[1.06] tracking-[-0.04em] text-[#111827] md:text-[58px]">Learn from prompts people actually ship.</h2>
            <p className="mt-6 max-w-[540px] text-[17px] leading-[1.65] text-[#667085]">Browse public repositories, inspect their version history, and fork a strong starting point into your private workspace.</p>
            <Link href="/explore" className="landing-primary-cta mt-8">Open Explore <ArrowIcon /></Link>
          </div>
          <div className="landing-public-repo">
            <div className="flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#667085]">Public repo</span><span className="rounded-full border border-[#d7e2f2] px-2 py-1 text-[9px] text-[#667085]">customer-support</span></div>
            <h3>support-agent-prod</h3><p>Production prompt for safe, concise customer support responses.</p>
            <div className="landing-public-code"><span># Response policy</span><br />Resolve clearly. Verify before acting.<br />Escalate low-confidence requests.</div>
            <div className="flex items-center justify-between text-[11px] text-[#7b8494]"><span>12 versions · 24 evals</span><span>View repo →</span></div>
          </div>
        </div>
      </section>

      <section id="faqs" className="border-t border-[#dfe3ea] bg-white px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto grid max-w-[1080px] gap-12 md:grid-cols-[0.72fr_1.28fr]" data-landing-reveal>
          <div><p className="landing-section-kicker">Details</p><h2 className="mt-5 text-[48px] font-bold tracking-[-0.045em] md:text-[72px]">Questions,<br />answered.</h2></div>
          <div className="border-t border-[#dfe3ea]">
            {faqItems.map((faq, index) => {
              const open = openFaq === index;
              return (
                <div key={faq.question} className="border-b border-[#dfe3ea]">
                  <button type="button" onClick={() => setOpenFaq(open ? null : index)} className="flex w-full items-center justify-between gap-6 py-6 text-left" aria-expanded={open}>
                    <span className="text-[19px] font-semibold tracking-[-0.02em] md:text-[22px]">{faq.question}</span>
                    <span className={`landing-faq-plus ${open ? "is-open" : ""}`}>+</span>
                  </button>
                  <div className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}><div className="overflow-hidden"><p className="max-w-[650px] pb-7 pr-10 text-[16px] leading-[1.7] text-[#697180]">{faq.answer}</p></div></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="landing-closing-cta px-5 py-24 text-white md:px-8 md:py-32">
        <div className="landing-closing-cta-inner mx-auto max-w-[900px] text-center" data-landing-reveal>
          <p className="landing-closing-eyebrow">Ready for a better release process?</p>
          <h2 className="mt-5 text-[46px] font-bold leading-[0.98] tracking-[-0.05em] md:text-[78px]">Your next prompt<br className="hidden md:block" /> should have a history.</h2>
          <p className="mx-auto mt-6 max-w-[570px] text-[18px] leading-[1.6] text-white/80">Create the repo, test the behavior, and ship the version you trust.</p>
          <Link href={primaryHref} className="landing-final-cta mt-9">Open Pupitar <ArrowIcon /></Link>
        </div>
      </section>

      <footer className="landing-site-footer px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="landing-footer-brand"><PupitarLogo size={25} /> Pupitar</Link>
          <p className="landing-footer-note">Version control for production prompts.</p>
          <div className="landing-footer-links"><a href="#product">Product</a><Link href="/explore">Explore</Link><a href="#faqs">FAQs</a></div>
        </div>
      </footer>
    </main>
  );
}
