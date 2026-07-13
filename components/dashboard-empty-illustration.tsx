type IllustrationKind = "repos" | "analytics" | "evals" | "deployments";

const common = {
  fill: "none",
  stroke: "var(--dash-muted)",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const
};

export function DashboardEmptyIllustration({ kind }: { kind: IllustrationKind }) {
  const accent = "var(--dash-accent)";
  const accentSoft = "var(--dash-accent-soft)";
  const surface = "var(--dash-surface)";
  const elevated = "var(--dash-elevated)";
  const line = "var(--dash-line)";

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 190 144"
      className={`dashboard-empty-illustration dashboard-empty-illustration-${kind}`}
    >
      {kind === "repos" ? (
        <>
          <ellipse cx="95" cy="126" rx="51" ry="6" fill="var(--dash-line)" opacity="0.42" />
          <g className="dashboard-empty-float dashboard-empty-float-slow">
            <path d="M43 42 124 29l12 70-81 13z" fill={elevated} stroke={line} strokeWidth="1.5" />
            <path d="m57 50 42-7M61 61l53-9M67 73l35-6" {...common} stroke="var(--dash-subtle)" />
            <circle cx="115" cy="77" r="8" fill={accentSoft} stroke={accent} strokeWidth="1.5" />
            <path d="m112 77 2 2 4-5" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g className="dashboard-empty-float">
            <path d="M66 31h28l7 8h45v50H66z" fill={surface} stroke={line} strokeWidth="1.7" />
            <path d="M66 39v-8h28l7 8" fill={accentSoft} stroke={line} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M82 57h47M82 67h34" {...common} stroke="var(--dash-muted)" />
            <rect x="81" y="77" width="23" height="10" rx="3" fill={accentSoft} />
            <path d="M87 82h11" stroke={accent} strokeWidth="1.7" strokeLinecap="round" />
          </g>
          <path d="M37 36h10M42 31v10M148 28h8M152 24v8M139 104h8M143 100v8" stroke={accent} strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="128" cy="22" r="2.5" fill={accent} />
          <circle cx="45" cy="104" r="2.5" fill="var(--dash-success)" />
        </>
      ) : null}

      {kind === "analytics" ? (
        <>
          <ellipse cx="95" cy="125" rx="56" ry="6" fill="var(--dash-line)" opacity="0.42" />
          <g className="dashboard-empty-float dashboard-empty-float-slow">
            <path d="M46 37h98v68H46z" fill={surface} stroke={line} strokeWidth="1.7" />
            <path d="M46 52h98" {...common} stroke={line} />
            <circle cx="58" cy="44.5" r="2.3" fill={accent} />
            <circle cx="66" cy="44.5" r="2.3" fill="var(--dash-muted)" />
            <path d="M59 96V66M78 96V78M97 96V57M116 96V71" stroke={accentSoft} strokeWidth="10" strokeLinecap="round" />
            <path d="m58 82 20-13 19 8 23-30" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="120" cy="47" r="4.5" fill={accent} stroke={surface} strokeWidth="2" />
          </g>
          <g className="dashboard-empty-float">
            <path d="M135 28a14 14 0 1 1-14 14 14 14 0 0 1 14-14Z" fill={accentSoft} stroke={accent} strokeWidth="1.5" />
            <path d="M135 35v7l5 3" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <path d="M35 34h9M39.5 29.5v9M151 100h10M156 95v10" stroke={accent} strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="42" cy="111" r="2.5" fill="var(--dash-success)" />
        </>
      ) : null}

      {kind === "evals" ? (
        <>
          <ellipse cx="95" cy="126" rx="53" ry="6" fill="var(--dash-line)" opacity="0.42" />
          <g className="dashboard-empty-float dashboard-empty-float-slow">
            <rect x="38" y="31" width="78" height="75" rx="7" fill={surface} stroke={line} strokeWidth="1.7" />
            <path d="M38 48h78" {...common} stroke={line} />
            <circle cx="50" cy="39.5" r="2.5" fill={accent} />
            <path d="m53 63 4 4 8-9M68 64h30M68 76h22" {...common} />
            <rect x="50" y="85" width="51" height="9" rx="4.5" fill={accentSoft} />
            <path d="M58 89.5h35" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
          </g>
          <g className="dashboard-empty-float">
            <path d="M127 48v26l13 22a4 4 0 0 1-3.5 6h-23a4 4 0 0 1-3.5-6l13-22V48" fill={elevated} stroke={line} strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M123 48h8M116 86h18" {...common} />
            <path d="M115 87h20l5 9h-30z" fill={accentSoft} />
            <circle cx="126.5" cy="91" r="2.6" fill={accent} />
          </g>
          <path d="M29 57h10M34 52v10M146 35h9M150.5 30.5v9" stroke={accent} strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="151" cy="112" r="2.5" fill="var(--dash-success)" />
        </>
      ) : null}

      {kind === "deployments" ? (
        <>
          <ellipse cx="95" cy="126" rx="55" ry="6" fill="var(--dash-line)" opacity="0.42" />
          <g className="dashboard-empty-float dashboard-empty-float-slow">
            <rect x="35" y="38" width="70" height="54" rx="6" fill={surface} stroke={line} strokeWidth="1.7" />
            <path d="M35 53h70" {...common} stroke={line} />
            <circle cx="47" cy="45.5" r="2.3" fill={accent} />
            <path d="m51 68 8 7-8 7M68 82h20" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <g className="dashboard-empty-float">
            <path d="M125 32c13 5 19 15 17 31l-15 15c-16 2-26-4-31-17l15-15c6-7 10-11 14-14Z" fill={accentSoft} stroke={accent} strokeWidth="1.7" strokeLinejoin="round" />
            <circle cx="125" cy="52" r="6" fill={surface} stroke={accent} strokeWidth="1.7" />
            <path d="m113 73-8 12 13-6M130 78l5 13 7-13" fill="none" stroke={accent} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <path d="M26 35h10M31 30v10M151 99h10M156 94v10" stroke={accent} strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="51" cy="108" r="2.5" fill="var(--dash-success)" />
        </>
      ) : null}
    </svg>
  );
}
