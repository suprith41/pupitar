"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/time";
import { Sidebar } from "../dashboard-shell";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

export type TimeRange = "7d" | "30d" | "all";

export type AnalyticsData = {
  range: TimeRange;
  totalRequests: number;
  avgLatency: number | null;
  evalPassRate: number | null;
  activeRepoCount: number;
  requestCountSeries: Array<{ date: string; label: string; count: number }>;
  latencySeries: Array<{ date: string; label: string; latency: number }>;
  evalScoresByRepo: Array<{ name: string; value: number }>;
  repos: Array<{
    id: string;
    name: string;
    created_at: string;
    requests: number;
    avgLatency: number | null;
    evalPassRate: number | null;
    lastActive: number | null;
    versionCount: number;
  }>;
};

type AnalyticsShellProps = {
  canCreateRepos: boolean;
  data: AnalyticsData;
};

const T = {
  bg: "#0F0F0F",
  surface: "#1A1A1A",
  ink: "#F0F0F0",
  muted: "#A0A0A0",
  line: "#2A2A2A",
  lineSoft: "#242424",
  accent: "#2067FF",
  accentHover: "#2F6BFF",
  success: "#4CAF82",
  dm: '"DM Sans", Arial, sans-serif',
  mono: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace'
} as const;

const RANGE_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "all", label: "All time" }
];

function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits
  }).format(value);
}

function toPercent(value: number | null) {
  if (value == null) return "—";
  return `${formatNumber(value, value % 1 === 0 ? 0 : 1)}%`;
}

function toMs(value: number | null) {
  if (value == null) return "—";
  return `${formatNumber(value, value % 1 === 0 ? 0 : 1)} ms`;
}

function StatCard({
  label,
  value,
  subtitle,
  valueColor
}: {
  label: string;
  value: string;
  subtitle: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.line}`,
        borderRadius: 8,
        padding: "20px 24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.4)"
      }}
    >
      <p style={{ margin: 0, fontFamily: T.dm, fontSize: 13, color: T.muted }}>{label}</p>
      <div
        style={{
          marginTop: 12,
          fontFamily: T.dm,
          fontSize: 32,
          fontWeight: 700,
          lineHeight: 1,
          color: valueColor ?? T.ink
        }}
      >
        {value}
      </div>
      <p style={{ margin: "8px 0 0", fontFamily: T.dm, fontSize: 13, color: T.muted }}>{subtitle}</p>
    </div>
  );
}

function Panel({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: T.surface,
        border: `1px solid ${T.line}`,
        borderRadius: 8,
        padding: 20
      }}
    >
      <h2 style={{ margin: "0 0 14px", fontFamily: T.dm, fontSize: 16, fontWeight: 600, color: T.ink }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ChartFrame({
  children,
  height
}: {
  children: React.ReactNode;
  height: number;
}) {
  return <div style={{ width: "100%", height }}>{children}</div>;
}

function EmptyState() {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: 520,
        border: `1px dashed ${T.line}`,
        borderRadius: 12,
        background: T.bg
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 520, padding: 24 }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            margin: "0 auto 18px",
            background: "radial-gradient(circle at 30% 30%, rgba(32,103,255,0.18), rgba(32,103,255,0.04) 60%, rgba(255,255,255,0) 70%)",
            border: `1px solid ${T.line}`
          }}
        />
        <div style={{ fontFamily: T.dm, fontSize: 18, fontWeight: 700, color: T.ink }}>No data yet.</div>
        <p style={{ margin: "10px 0 0", fontFamily: T.dm, fontSize: 14, color: T.muted, lineHeight: 1.6 }}>
          Deploy a prompt and make some API calls to see analytics here.
        </p>
      </div>
    </div>
  );
}

function RangePill({
  active,
  href,
  children
}: {
  active: boolean;
  href: string;
  children: string;
}) {
  return (
    <Link
      href={href}
      style={{
        height: 34,
        padding: "0 14px",
        borderRadius: 999,
        border: `1px solid ${active ? T.accent : T.line}`,
        background: active ? T.accent : T.surface,
        color: active ? "#fff" : T.muted,
        fontFamily: T.dm,
        fontSize: 14,
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        whiteSpace: "nowrap"
      }}
    >
      {children}
    </Link>
  );
}

function MetricBadge({ children }: { children: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 24,
        padding: "0 8px",
        borderRadius: 999,
        background: T.lineSoft,
        color: T.muted,
        fontFamily: T.dm,
        fontSize: 12,
        fontWeight: 500
      }}
    >
      {children}
    </span>
  );
}

function RepoTable({ rows }: { rows: AnalyticsData["repos"] }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.line}`,
        borderRadius: 8,
        overflow: "hidden"
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2.2fr 0.8fr 0.9fr 0.9fr 1fr",
          gap: 16,
          padding: "14px 20px",
          borderBottom: `1px solid ${T.line}`,
          fontFamily: T.dm,
          fontSize: 12,
          fontWeight: 600,
          color: T.muted,
          textTransform: "uppercase",
          letterSpacing: "0.08em"
        }}
      >
        <div>Repo name</div>
        <div>Requests</div>
        <div>Avg latency</div>
        <div>Eval pass rate</div>
        <div>Last active</div>
      </div>

      {rows.map((row, index) => (
        <div
          key={row.id}
          style={{
            display: "grid",
            gridTemplateColumns: "2.2fr 0.8fr 0.9fr 0.9fr 1fr",
            gap: 16,
            padding: "14px 20px",
            borderBottom: index === rows.length - 1 ? "none" : `1px solid ${T.line}`,
            background: index % 2 === 0 ? T.surface : T.bg,
            fontFamily: T.dm,
            fontSize: 14,
            color: T.ink,
            alignItems: "center"
          }}
        >
          <div style={{ minWidth: 0 }}>
            <Link href={`/dashboard/${row.id}`} style={{ color: T.accent, fontWeight: 500 }}>
              {row.name}
            </Link>
          </div>
          <div>{formatNumber(row.requests)}</div>
          <div>{toMs(row.avgLatency)}</div>
          <div style={{ color: row.evalPassRate != null && row.evalPassRate >= 50 ? T.success : T.ink }}>
            {toPercent(row.evalPassRate)}
          </div>
          <div style={{ color: T.muted }}>{row.lastActive == null ? "—" : formatRelativeTime(new Date(row.lastActive).toISOString())}</div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsShell({ canCreateRepos: _canCreateRepos, data }: AnalyticsShellProps) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setUserEmail(session?.user.email ?? null);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: T.bg,
        overflow: "hidden"
      }}
    >
      <Sidebar userEmail={userEmail} onSignOut={handleSignOut} />

      <main style={{ flex: 1, minWidth: 0, height: "100vh", overflowY: "auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "20px 24px 18px"
          }}
        >
          <h1
            style={{
              margin: 0,
              fontFamily: T.dm,
              fontSize: 22,
              fontWeight: 700,
              color: T.ink,
              lineHeight: 1
            }}
          >
            Analytics
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {RANGE_OPTIONS.map((option) => (
              <RangePill
                key={option.value}
                active={data.range === option.value}
                href={`/dashboard/analytics?range=${option.value}`}
              >
                {option.label}
              </RangePill>
            ))}
          </div>
        </div>

        <div style={{ padding: "0 24px 28px" }}>
          <div style={{ maxWidth: 1460, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
            {data.totalRequests === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 16
                  }}
                >
                  <StatCard
                    label="Total Requests"
                    value={formatNumber(data.totalRequests)}
                    subtitle="API calls to deployed prompts"
                  />
                  <StatCard label="Avg Latency" value={toMs(data.avgLatency)} subtitle="Average response time" />
                  <StatCard
                    label="Eval Pass Rate"
                    value={toPercent(data.evalPassRate)}
                    subtitle="Across all eval runs"
                    valueColor={T.success}
                  />
                  <StatCard
                    label="Active Repos"
                    value={formatNumber(data.activeRepoCount)}
                    subtitle="Repos with at least one request"
                  />
                </div>

                <Panel title="Requests over time">
                  <ChartFrame height={320}>
                    <ResponsiveContainer>
                      <LineChart data={data.requestCountSeries} margin={{ top: 12, right: 18, bottom: 28, left: 44 }}>
                        <CartesianGrid stroke={T.line} />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: T.muted, fontSize: 11 }}
                          tickFormatter={(value) => String(value)}
                        />
                        <YAxis tick={{ fill: T.muted, fontSize: 11 }} tickCount={5} />
                        <Tooltip
                          {...({
                            contentStyle: {
                              background: T.surface,
                              border: `1px solid ${T.line}`,
                              borderRadius: 8,
                              color: T.ink
                            },
                            labelStyle: { color: T.muted },
                            itemStyle: { color: T.ink }
                          } as any)}
                        />
                        <Line dataKey="count" stroke={T.accent} strokeWidth={2.5} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartFrame>
                </Panel>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
                  <Panel title="Latency over time">
                    <ChartFrame height={280}>
                      <ResponsiveContainer>
                        <LineChart data={data.latencySeries} margin={{ top: 12, right: 18, bottom: 28, left: 44 }}>
                          <CartesianGrid stroke={T.line} />
                          <XAxis
                            dataKey="label"
                            tick={{ fill: T.muted, fontSize: 11 }}
                            tickFormatter={(value) => String(value)}
                          />
                          <YAxis tick={{ fill: T.muted, fontSize: 11 }} tickCount={5} tickFormatter={(value) => `${Math.round(Number(value))}`} />
                          <Tooltip
                            {...({
                              contentStyle: {
                                background: T.surface,
                                border: `1px solid ${T.line}`,
                                borderRadius: 8,
                                color: T.ink
                              },
                              labelStyle: { color: T.muted },
                              itemStyle: { color: T.ink }
                            } as any)}
                          />
                          <Line dataKey="latency" stroke={T.muted} strokeWidth={2.5} dot />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartFrame>
                  </Panel>

                  <Panel title="Eval scores by repo">
                    <ChartFrame height={280}>
                      <ResponsiveContainer>
                        <BarChart data={data.evalScoresByRepo} margin={{ top: 12, right: 18, bottom: 28, left: 44 }}>
                          <CartesianGrid stroke={T.line} />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: T.muted, fontSize: 11 }}
                            tickFormatter={(value) => String(value).slice(0, 10)}
                          />
                          <YAxis tick={{ fill: T.muted, fontSize: 11 }} tickCount={5} tickFormatter={(value) => `${Math.round(Number(value))}`} />
                          <Tooltip
                            {...({
                              contentStyle: {
                                background: T.surface,
                                border: `1px solid ${T.line}`,
                                borderRadius: 8,
                                color: T.ink
                              },
                              labelStyle: { color: T.muted },
                              itemStyle: { color: T.ink }
                            } as any)}
                          />
                          <Bar dataKey="value" fill={T.accent} radius={4} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartFrame>
                  </Panel>
                </div>

                <div>
                  <h2 style={{ margin: "0 0 14px", fontFamily: T.dm, fontSize: 16, fontWeight: 600, color: T.ink }}>
                    By Repo
                  </h2>
                  <RepoTable rows={data.repos} />
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
