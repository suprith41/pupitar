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
    <div className="landing-product-scene" data-landing-tilt>
      <div className="landing-product-plane" aria-hidden="true" />
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

      <div className="landing-scene-float landing-scene-float-branch" aria-hidden="true">
        <span>BRANCH</span><b>safer-refunds</b><i>+3 changes</i>
      </div>
      <div className="landing-scene-float landing-scene-float-score" aria-hidden="true">
        <span>RELEASE SCORE</span><strong>96</strong><i>/100</i>
      </div>
      <div className="landing-scene-status" aria-hidden="true"><i /> Production ready</div>
    </div>
  );
}

function FeatureIllustration({ kind }: { kind: "versions" | "evals" | "deploy" }) {
  return (
    <div className={`landing-feature-visual landing-feature-${kind}`} data-landing-tilt aria-hidden="true">
      <div className="landing-feature-grid" />
      {kind === "versions" ? (
        <div className="landing-version-scene">
          <div className="landing-version-rail"><i /><i /><i /><i /></div>
          <div className="landing-version-layer is-back"><span>v10</span><b>tone-fix</b><em>8 files</em></div>
          <div className="landing-version-layer is-middle"><span>v11</span><b>stable</b><em>12/12 passed</em></div>
          <div className="landing-version-layer is-front"><span>v12</span><b>safer-refunds</b><em>Ready to merge</em></div>
          <div className="landing-version-tag">main</div>
        </div>
      ) : null}
      {kind === "evals" ? (
        <div className="landing-eval-scene">
          <div className="landing-eval-score-ring"><div><strong>96</strong><span>quality</span></div></div>
          <div className="landing-eval-panel">
            <div className="landing-eval-panel-head"><span>Release gate</span><b>12/12 passed</b></div>
            {[['Accuracy', '100%'], ['Safety', '100%'], ['Tone', '96%']].map(([label, value]) => (
              <div className="landing-eval-row" key={label}><i><CheckIcon /></i><span>{label}</span><b>{value}</b></div>
            ))}
          </div>
          <div className="landing-eval-badge"><i /> No regressions</div>
        </div>
      ) : null}
      {kind === "deploy" ? (
        <div className="landing-deploy-scene">
          <div className="landing-deploy-orbit is-outer"><span>SDK</span><span>API</span><span>LOGS</span></div>
          <div className="landing-deploy-orbit is-inner" />
          <div className="landing-deploy-cube">
            <div className="landing-cube-face is-front">LIVE</div>
            <div className="landing-cube-face is-back">v12</div>
            <div className="landing-cube-face is-right">API</div>
            <div className="landing-cube-face is-left">200</div>
            <div className="landing-cube-face is-top">↗</div>
            <div className="landing-cube-face is-bottom">P</div>
          </div>
          <div className="landing-deploy-endpoint"><span>POST</span><code>/v1/support-agent</code><i>24ms</i></div>
        </div>
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
  const [hasEnteredHero, setHasEnteredHero] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setHasEnteredHero(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const surfaces = Array.from(document.querySelectorAll<HTMLElement>("[data-landing-tilt]"));
    const cleanups = surfaces.map((surface) => {
      const onPointerMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        const bounds = surface.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        surface.style.setProperty("--tilt-x", `${(-y * 5).toFixed(2)}deg`);
        surface.style.setProperty("--tilt-y", `${(x * 7).toFixed(2)}deg`);
        surface.style.setProperty("--glow-x", `${((x + 0.5) * 100).toFixed(1)}%`);
        surface.style.setProperty("--glow-y", `${((y + 0.5) * 100).toFixed(1)}%`);
      };
      const onPointerLeave = () => {
        surface.style.setProperty("--tilt-x", "0deg");
        surface.style.setProperty("--tilt-y", "0deg");
        surface.style.setProperty("--glow-x", "50%");
        surface.style.setProperty("--glow-y", "50%");
      };

      surface.addEventListener("pointermove", onPointerMove);
      surface.addEventListener("pointerleave", onPointerLeave);
      return () => {
        surface.removeEventListener("pointermove", onPointerMove);
        surface.removeEventListener("pointerleave", onPointerLeave);
      };
    });

    return () => cleanups.forEach((cleanup) => cleanup());
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
          <div className="relative mx-auto flex h-[72px] w-full max-w-[1200px] items-center justify-between px-5 md:px-8">
            <Link href="/" className="landing-hero-brand">
              <PupitarLogo size={46} /> <span>Pupitar</span>
            </Link>
            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 whitespace-nowrap text-[14px] font-medium text-black md:flex">
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
            <div className={`landing-hero-kicker landing-hero-enter landing-hero-enter-1 mx-auto ${hasEnteredHero ? "is-active" : ""}`}><span /> Version control for production prompts</div>
            <h1 className={`landing-hero-title landing-hero-enter landing-hero-enter-2 mt-7 text-[44px] font-bold leading-[1.02] tracking-[-0.05em] md:text-[68px] lg:text-[76px] ${hasEnteredHero ? "is-active" : ""}`}>
              The unified workspace for<br /><span>prompt engineers.</span>
            </h1>
            <p className={`landing-hero-enter landing-hero-enter-3 mx-auto mt-7 max-w-[660px] text-[18px] leading-[1.6] text-white md:text-[21px] ${hasEnteredHero ? "is-active" : ""}`}>
              Branch, evaluate, review, and deploy AI prompts with the discipline you already bring to code.
            </p>
            <div className={`landing-hero-enter landing-hero-enter-4 mt-9 flex items-center justify-center ${hasEnteredHero ? "is-active" : ""}`}>
              <Link href={primaryHref} className="landing-primary-cta">Start prompting <ArrowIcon /></Link>
            </div>
            <p className={`landing-hero-enter landing-hero-enter-5 mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-white ${hasEnteredHero ? "is-active" : ""}`}>Branch instantly · Deploy securely</p>
          </div>

        </div>
      </section>

      <section className="landing-product-showcase">
        <div className="landing-showcase-shell mx-auto max-w-[1200px]">
          <div className="landing-showcase-intro" data-landing-reveal>
            <div>
              <p className="landing-section-kicker">Your prompt control room</p>
              <h2>Everything that happens to a prompt, in one living system.</h2>
            </div>
            <p>From the first edit to the live endpoint, Pupitar keeps every decision visible, testable, and reversible.</p>
          </div>

          <div className="landing-product-stage" data-landing-reveal>
            <ProductDemo />
          </div>

          <div className="landing-proof-strip" data-landing-reveal>
            {[
              ['01', 'Write with context', 'A focused editor built around prompt work.'],
              ['02', 'Branch every idea', 'Experiment without disturbing production.'],
              ['03', 'Prove the change', 'Run repeatable evaluations before merge.'],
              ['04', 'Ship one truth', 'Deploy the exact version you approved.']
            ].map(([number, title, body]) => (
              <div className="landing-proof-item" key={number}>
                <span>{number}</span><h3>{title}</h3><p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="landing-feature-section">
        <div className="mx-auto max-w-[1160px]">
          <div className="landing-editorial-heading" data-landing-reveal>
            <p className="landing-section-kicker">The prompt repository</p>
            <h2>Prompts evolve.<br /><span>Your system should remember why.</span></h2>
            <p>Pupitar gives every prompt the structure code already has: history, review, quality gates, and a traceable path to production.</p>
          </div>

          <div className="landing-feature-list">
            {features.map((feature, index) => (
              <article key={feature.title} className={`landing-feature-row ${index % 2 ? "is-reverse" : ""}`} data-landing-reveal>
                <div className="landing-feature-copy">
                  <div className="landing-feature-meta"><span>0{index + 1}</span><i />{feature.eyebrow}</div>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                  <ul>
                    {feature.points.map((point) => <li key={point}><span><CheckIcon /></span>{point}</li>)}
                  </ul>
                </div>
                <FeatureIllustration kind={feature.illustration} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="landing-workflow-section">
        <div className="landing-workflow-glow" aria-hidden="true" />
        <div className="mx-auto max-w-[1160px]">
          <div className="landing-workflow-heading" data-landing-reveal>
            <div>
              <p className="landing-section-kicker">A calm release path</p>
              <h2>From idea to endpoint,<br />without the chaos.</h2>
            </div>
            <p>A short, explicit workflow lets your team move quickly while every production decision stays explainable.</p>
          </div>

          <div className="landing-workflow-board" data-landing-reveal data-landing-tilt>
            <div className="landing-workflow-route" aria-hidden="true"><i /></div>
            {workflow.map(([number, title, body], index) => (
              <div className="landing-workflow-step" key={number}>
                <div className="landing-workflow-icon"><span>{number}</span><i>{index === workflow.length - 1 ? 'LIVE' : '0' + (index + 1)}</i></div>
                <h3>{title}</h3>
                <p>{body}</p>
                <div className="landing-workflow-state"><i />{index === workflow.length - 1 ? 'Production' : 'Complete'}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-discovery-section">
        <div className="landing-explore-card mx-auto max-w-[1160px]" data-landing-reveal data-landing-tilt>
          <div className="landing-explore-copy">
            <p className="landing-section-kicker">Public discovery</p>
            <h2>Great prompts leave clues.</h2>
            <p>Explore repositories people actually ship. Inspect their version history, learn from the decisions, then fork a strong starting point into your workspace.</p>
            <Link href="/explore" className="landing-inline-cta">Explore public repos <ArrowIcon /></Link>
            <div className="landing-explore-stats"><span><b>100+</b> public prompts</span><span><b>1-click</b> forks</span></div>
          </div>

          <div className="landing-repo-stage" aria-label="Public prompt repository preview">
            <div className="landing-repo-card is-back"><span>sales-agent</span><i>92 quality</i></div>
            <div className="landing-repo-card is-middle"><span>research-copilot</span><i>18 versions</i></div>
            <div className="landing-public-repo">
              <div className="landing-repo-head"><span><i /> Public repo</span><b>customer-support</b></div>
              <h3>support-agent-prod</h3>
              <p>Production prompt for safe, concise customer support responses.</p>
              <div className="landing-public-code"><span># Response policy</span><br />Resolve clearly. Verify before acting.<br />Escalate low-confidence requests.</div>
              <div className="landing-repo-foot"><span>12 versions · 24 evals</span><b>96 quality</b></div>
            </div>
            <div className="landing-repo-float"><span>FORKED</span><b>Ready in your workspace</b></div>
          </div>
        </div>
      </section>

      <section id="faqs" className="landing-faq-section">
        <div className="landing-faq-shell mx-auto max-w-[1100px]" data-landing-reveal>
          <div className="landing-faq-intro">
            <p className="landing-section-kicker">Details, without the fine print</p>
            <h2>Questions,<br /><span>answered.</span></h2>
            <p>The short version: Pupitar gives prompt work the same clarity and confidence as modern software delivery.</p>
            <div className="landing-faq-object" aria-hidden="true">
              <div className="landing-faq-orbit is-one" />
              <div className="landing-faq-orbit is-two" />
              <div className="landing-faq-core"><span>?</span></div>
            </div>
          </div>

          <div className="landing-faq-list">
            {faqItems.map((faq, index) => {
              const open = openFaq === index;
              return (
                <div key={faq.question} className={`landing-faq-item ${open ? "is-open" : ""}`}>
                  <button type="button" onClick={() => setOpenFaq(open ? null : index)} className="landing-faq-question" aria-expanded={open}>
                    <span className="landing-faq-number">0{index + 1}</span>
                    <span>{faq.question}</span>
                    <span className={`landing-faq-plus ${open ? "is-open" : ""}`}>+</span>
                  </button>
                  <div className={`landing-faq-answer ${open ? "is-open" : ""}`}><div><p>{faq.answer}</p></div></div>
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
