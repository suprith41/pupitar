import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { redirect } from "next/navigation";
import AnalyticsShell, {
  type AnalyticsData,
  type TimeRange
} from "./analytics-shell";

type SearchParams = {
  range?: string;
};

type RepoRow = {
  id: string;
  name: string;
  created_at: string;
};

type RequestLogRow = {
  id?: string;
  repo_id: string;
  latency_ms: number | null;
  token_count: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  status: string | null;
  created_at: string;
};

type EvalRunRow = {
  id?: string;
  repo_id: string;
  score: number;
  total: number;
  created_at: string;
};

type PromptVersionRow = {
  id?: string;
  repo_id: string;
  created_at: string;
};

function normalizeRange(input?: string): TimeRange {
  if (input === "30d" || input === "all") return input;
  return "7d";
}

function getRangeStart(range: TimeRange) {
  if (range === "all") return null;
  const days = range === "30d" ? 30 : 7;
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start;
}

function toIsoDay(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function buildDaySeries(start: Date, end: Date) {
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(toIsoDay(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function average(values: Array<number | null | undefined>) {
  const filtered = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!filtered.length) return null;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function sum(values: Array<number | null | undefined>) {
  return values.reduce<number>(
    (total, value) => total + (typeof value === "number" && Number.isFinite(value) ? value : 0),
    0
  );
}

function buildAnalytics({
  repos,
  requestLogs,
  evalRuns,
  promptVersions,
  range
}: {
  repos: RepoRow[];
  requestLogs: RequestLogRow[];
  evalRuns: EvalRunRow[];
  promptVersions: PromptVersionRow[];
  range: TimeRange;
}): AnalyticsData {
  const logsByRepo = new Map<string, RequestLogRow[]>();
  const evalsByRepo = new Map<string, EvalRunRow[]>();
  const promptVersionsByRepo = new Map<string, PromptVersionRow[]>();

  for (const log of requestLogs) {
    const bucket = logsByRepo.get(log.repo_id) ?? [];
    bucket.push(log);
    logsByRepo.set(log.repo_id, bucket);
  }

  for (const run of evalRuns) {
    const bucket = evalsByRepo.get(run.repo_id) ?? [];
    bucket.push(run);
    evalsByRepo.set(run.repo_id, bucket);
  }

  for (const version of promptVersions) {
    const bucket = promptVersionsByRepo.get(version.repo_id) ?? [];
    bucket.push(version);
    promptVersionsByRepo.set(version.repo_id, bucket);
  }

  const requestDates = requestLogs.map((log) => new Date(log.created_at));
  const minRequestDate = requestDates.length
    ? new Date(Math.min(...requestDates.map((date) => date.getTime())))
    : null;
  const endDate = startOfUtcDay(new Date());
  const startDate =
    range === "all"
      ? minRequestDate
        ? startOfUtcDay(minRequestDate)
        : null
      : getRangeStart(range);

  const daySeries = startDate ? buildDaySeries(startDate, endDate) : [];
  const requestCountByDay = new Map(daySeries.map((day) => [day, 0]));
  const latencyByDay = new Map(daySeries.map((day) => [day, [] as number[]]));

  for (const log of requestLogs) {
    const day = toIsoDay(log.created_at);
    if (!requestCountByDay.has(day)) continue;
    requestCountByDay.set(day, (requestCountByDay.get(day) ?? 0) + 1);
    if (typeof log.latency_ms === "number" && Number.isFinite(log.latency_ms)) {
      latencyByDay.get(day)?.push(log.latency_ms);
    }
  }

  const requestsOverTime = daySeries.map((day) => ({
    date: day,
    label: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${day}T00:00:00Z`)),
    count: requestCountByDay.get(day) ?? 0
  }));

  const latencyOverTime = daySeries.map((day) => {
    const values = latencyByDay.get(day) ?? [];
    return {
      date: day,
      label: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${day}T00:00:00Z`)),
      latency: average(values) ?? 0
    };
  });

  const repoMetrics = repos
    .map((repo) => {
      const repoLogs = logsByRepo.get(repo.id) ?? [];
      const repoEvals = evalsByRepo.get(repo.id) ?? [];
      const repoVersions = promptVersionsByRepo.get(repo.id) ?? [];
      const requests = repoLogs.length;
      const avgLatency = average(repoLogs.map((log) => log.latency_ms));
      const evalScoreTotal = sum(repoEvals.map((run) => run.score));
      const evalTotal = sum(repoEvals.map((run) => run.total));
      const evalPassRate = evalTotal > 0 ? (evalScoreTotal / evalTotal) * 100 : null;
      const lastActive = repoLogs.reduce((latest, log) => {
        const current = new Date(log.created_at).getTime();
        return current > latest ? current : latest;
      }, 0);

      return {
        id: repo.id,
        name: repo.name,
        created_at: repo.created_at,
        requests,
        avgLatency,
        evalPassRate,
        lastActive: lastActive || null,
        versionCount: repoVersions.length
      };
    })
    .filter((repo) => repo.requests > 0)
    .sort((a, b) => b.requests - a.requests || a.name.localeCompare(b.name));

  const evalScoresByRepo = repoMetrics.map((repo) => ({
    name: repo.name,
    value: repo.evalPassRate ?? 0
  }));

  const totalRequests = requestLogs.length;
  const avgLatency = average(requestLogs.map((log) => log.latency_ms));
  const evalPassRateTotal = (() => {
    const totalScore = sum(evalRuns.map((run) => run.score));
    const totalCases = sum(evalRuns.map((run) => run.total));
    return totalCases > 0 ? (totalScore / totalCases) * 100 : null;
  })();
  const activeRepoCount = new Set(requestLogs.map((log) => log.repo_id)).size;

  return {
    range,
    totalRequests,
    avgLatency,
    evalPassRate: evalPassRateTotal,
    activeRepoCount,
    requestCountSeries: requestsOverTime,
    latencySeries: latencyOverTime,
    evalScoresByRepo,
    repos: repoMetrics
  };
}

export default async function AnalyticsPage({ searchParams }: { searchParams?: SearchParams }) {
  const range = normalizeRange(searchParams?.range);

  if (!hasSupabaseConfig()) {
    return (
      <AnalyticsShell
        canCreateRepos={false}
        data={buildAnalytics({
          repos: [],
          requestLogs: [],
          evalRuns: [],
          promptVersions: [],
          range
        })}
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: repos } = await supabase
    .from("repos")
    .select("id, name, created_at")
    .eq("owner_id", user.id)
    .order("created_at", {
      ascending: false
    });

  const repoIds = (repos ?? []).map((repo) => repo.id);

  const [requestLogsResult, evalRunsResult, promptVersionsResult] = repoIds.length
    ? await Promise.all([
        supabase.from("request_logs").select("*").in("repo_id", repoIds),
        supabase.from("eval_runs").select("*").in("repo_id", repoIds),
        supabase.from("prompt_versions").select("repo_id, created_at").in("repo_id", repoIds)
      ])
    : [
        { data: [] as RequestLogRow[] },
        { data: [] as EvalRunRow[] },
        { data: [] as PromptVersionRow[] }
      ];

  const repoRows = (repos ?? []) as RepoRow[];
  const requestRows = (requestLogsResult.data ?? []) as RequestLogRow[];
  const evalRows = (evalRunsResult.data ?? []) as EvalRunRow[];
  const promptVersionRows = (promptVersionsResult.data ?? []) as PromptVersionRow[];

  const rangeStart = getRangeStart(range);
  const filteredRequestRows =
    rangeStart == null ? requestRows : requestRows.filter((log) => new Date(log.created_at) >= rangeStart);
  const filteredEvalRows =
    rangeStart == null ? evalRows : evalRows.filter((run) => new Date(run.created_at) >= rangeStart);
  const filteredPromptVersionRows =
    rangeStart == null
      ? promptVersionRows
      : promptVersionRows.filter((version) => new Date(version.created_at) >= rangeStart);

  const data = buildAnalytics({
    repos: repoRows,
    requestLogs: filteredRequestRows,
    evalRuns: filteredEvalRows,
    promptVersions: filteredPromptVersionRows,
    range
  });

  return <AnalyticsShell canCreateRepos data={data} />;
}
