import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { clearAdminSession, getAdminUser } from "../auth";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend,
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

type OpsData = {
  generatedAt?: string;
  chatApiBase?: string;
  summary?: {
    totalOrders?: number; failureRate?: number;
    avgResponseTimeMs?: number; currentAlarmCount?: number;
    totalLogEvents?: number; errorRate?: number;
    peakHour?: string; topErrorStream?: string; topErrorPct?: number;
    operatorMetrics?: { totalOrders?: number; failureRate?: number; avgResponseTimeMs?: number; currentAlarmCount?: number; };
    operatorMetricsSource?: string;
  };
  hourlyChart?: { rowCount?: number; labels?: string[]; totals?: number[]; errors?: number[]; };
  resourceCheck?: {
    total?: number;
    byType?: Record<string, number>;
    items?: { checkType?: string; resourceType?: string; resourceId?: string; reason?: string }[];
  };
  athenaQueries?: { label?: string; sql?: string; rowCount?: number; headers?: string[]; rows?: Record<string, string>[]; error?: string; }[];
  reports?: { reportDate?: string; reportType?: string; title?: string; s3Url?: string; }[];
};

const DATA_URL = "https://data.fiveline.store/data.json";
const CHAT_SESSION_KEY = "fiveline_chat_session_id";

function useOpsData() {
  const [data, setData] = useState<OpsData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = () =>
      fetch(`${DATA_URL}?t=${Date.now()}`)
        .then((r) => r.json())
        .then((d) => { setData(d); setLoading(false); })
        .catch(() => setLoading(false));
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);
  return { data, loading };
}
type AdminOrder = { id: number; total_price: number; status: string; created_at: string; email: string; user_name: string };
type AdminUser = { id: number; email: string; name: string; role: string; phone: string | null; created_at: string };
type AdminProduct = { id: number; name: string; category: string; brand: string | null; price: number; stock_quantity: number };

const TABS = ["대시보드", "주문관리", "사용자", "상품관리", "모니터링", "배포관리"] as const;
type Tab = typeof TABS[number];

const GRAFANA_URL = "https://grafana.fiveline.store";

const STATUS_LABEL: Record<string, string> = { SUCCESS: "결제완료", FAILED: "결제실패", PENDING: "처리중" };
const STATUS_COLOR: Record<string, { background: string; color: string }> = {
  SUCCESS: { background: "#ecfdf5", color: "#065f46" },
  FAILED: { background: "#fef2f2", color: "#991b1b" },
  PENDING: { background: "#fffbeb", color: "#92400e" },
};

function useDebounce(value: string, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("대시보드");
  const user = getAdminUser();

  function handleLogout() {
    clearAdminSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen" style={{ background: "#f9fafb" }}>
      <div className="border-b bg-white px-6 py-3 flex items-center justify-between" style={{ borderColor: "#e5e7eb" }}>
        <h1 className="text-base font-black tracking-widest" style={{ color: "#111" }}>FIVELINE 운영자 포털</h1>
        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: "#666" }}>{user?.name}님</span>
          <button onClick={handleLogout} className="text-xs px-3 py-1.5 border rounded-sm" style={{ borderColor: "#ddd", color: "#555" }}>로그아웃</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-0 mb-6 border-b" style={{ borderColor: "#e5e7eb" }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-5 py-2.5 text-sm font-medium transition-colors"
              style={{ borderBottom: tab === t ? "2px solid #111" : "2px solid transparent", color: tab === t ? "#111" : "#888", marginBottom: "-1px" }}>
              {t}
            </button>
          ))}
        </div>

        {tab === "대시보드" && <DashboardTab />}
        {tab === "주문관리" && <OrdersTab />}
        {tab === "사용자" && <UsersTab />}
        {tab === "상품관리" && <ProductsTab />}
        {tab === "모니터링" && <MonitoringTab />}
        {tab === "배포관리" && <CodeQualityTab />}
      </div>
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#aaa" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8 pr-3 py-1.5 text-sm border rounded-sm outline-none w-64"
        style={{ borderColor: value ? "#111" : "#ddd", color: "#333" }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "#111")}
        onBlur={(e) => (e.currentTarget.style.borderColor = value ? "#111" : "#ddd")}
      />
      {value && (
        <button onClick={() => onChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#aaa" }}>✕</button>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border p-5" style={{ borderColor: "#e5e7eb" }}>
      <p className="text-xs font-medium mb-1" style={{ color: "#999" }}>{label}</p>
      <p className="text-2xl font-black" style={{ color: "#111" }}>{value}</p>
    </div>
  );
}

function DashboardTab() {
  const { data, loading } = useOpsData();
  if (loading && !data)
    return <p className="text-sm" style={{ color: "#bbb" }}>운영 데이터 불러오는 중...</p>;

  const s = data?.summary ?? {};
  const op = s.operatorMetrics;
  const pick = <T,>(a: T | undefined, b: T | undefined): T | undefined => (a != null ? a : b);
  const totalOrders = pick(op?.totalOrders, s.totalOrders);
  const failureRate = pick(op?.failureRate, s.failureRate);
  const avgMs       = pick(op?.avgResponseTimeMs, s.avgResponseTimeMs);
  const alarmCount  = pick(op?.currentAlarmCount, s.currentAlarmCount);
  const fromMonitoring = s.operatorMetricsSource === "monitoring-team";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: "#aaa" }}>
          {data?.generatedAt ? `데이터 생성: ${new Date(data.generatedAt).toLocaleString("ko-KR")}` : ""}
        </span>
        <RefreshButton onClick={() => window.location.reload()} />
      </div>

      {/* 오늘 운영 요약 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-bold" style={{ color: "#111" }}>오늘 운영 요약</h3>
          {fromMonitoring && (
            <span className="text-xs px-2 py-0.5 rounded-sm" style={{ background: "#ecfdf5", color: "#065f46" }}>
              모니터링팀 실데이터
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard label="총 주문" value={totalOrders != null ? totalOrders.toLocaleString() : "-"} />
          <KpiCard label="실패율" value={failureRate != null ? `${(Number(failureRate) * (Number(failureRate) <= 1 ? 100 : 1)).toFixed(1)}%` : "-"} />
          <KpiCard label="평균 응답시간" value={avgMs != null ? `${avgMs}ms` : "-"} />
          <KpiCard label="활성 알람" value={alarmCount != null ? String(alarmCount) : "-"} />
        </div>
      </div>

      {/* 로그 분석 */}
      <div>
        <h3 className="text-sm font-bold mb-3" style={{ color: "#111" }}>로그 분석 (실데이터)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard label="총 로그 이벤트" value={s.totalLogEvents != null ? s.totalLogEvents.toLocaleString() : "-"} />
          <KpiCard label="에러율" value={s.errorRate != null ? `${Number(s.errorRate).toFixed(2)}%` : "-"} />
          <KpiCard label="피크 시간" value={s.peakHour ?? "-"} />
          <div className="bg-white border p-5" style={{ borderColor: "#e5e7eb" }}>
            <p className="text-xs font-medium mb-1" style={{ color: "#999" }}>최고 에러 스트림</p>
            <p className="text-sm font-black truncate" style={{ color: "#f97316" }} title={s.topErrorStream ?? "-"}>
              {s.topErrorStream ?? "-"}
            </p>
            {s.topErrorPct != null && (
              <p className="text-xs mt-1" style={{ color: "#aaa" }}>에러율 {Number(s.topErrorPct).toFixed(2)}%</p>
            )}
          </div>
        </div>
      </div>

      <HourlyChartCard data={data?.hourlyChart} />
      <ResourceCheckCard data={data?.resourceCheck} />
      <AthenaCard queries={data?.athenaQueries ?? []} />
      <ReportsCard reports={data?.reports ?? []} />
      <AIChatCard chatApiBase={data?.chatApiBase ?? ""} />
    </div>
  );
}

function HourlyChartCard({ data }: { data?: OpsData["hourlyChart"] }) {
  if (!data?.labels?.length) return null;
  return (
    <div className="bg-white border p-5" style={{ borderColor: "#e5e7eb" }}>
      <h3 className="text-sm font-bold mb-4" style={{ color: "#111" }}>
        시간대별 로그·에러 추이
        <span className="ml-2 text-xs font-normal" style={{ color: "#aaa" }}>({data.rowCount ?? 0}개 구간)</span>
      </h3>
      <Bar
        data={{
          labels: data.labels,
          datasets: [
            { label: "총 이벤트",  data: data.totals ?? [], backgroundColor: "#3b82f6" },
            { label: "에러 이벤트", data: data.errors ?? [], backgroundColor: "#ef4444" },
          ],
        }}
        options={{
          responsive: true,
          plugins: { legend: { position: "bottom" as const } },
          scales: { y: { beginAtZero: true } },
        }}
      />
    </div>
  );
}

function ResourceCheckCard({ data }: { data?: OpsData["resourceCheck"] }) {
  if (!data) return null;
  const labels = Object.keys(data.byType ?? {});
  const values = Object.values(data.byType ?? {});
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div className="bg-white border p-5" style={{ borderColor: "#e5e7eb" }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: "#111" }}>
          리소스 점검 결과
          <span className="ml-2 text-xs font-normal" style={{ color: "#aaa" }}>총 {data.total ?? 0}건</span>
        </h3>
        {labels.length > 0 ? (
          <Doughnut
            data={{
              labels,
              datasets: [{ data: values, backgroundColor: ["#ef4444","#f59e0b","#3b82f6","#10b981","#8b5cf6"] }],
            }}
            options={{ plugins: { legend: { position: "bottom" as const } } }}
          />
        ) : (
          <p className="text-xs" style={{ color: "#bbb" }}>점검 결과 없음</p>
        )}
      </div>
      <div className="bg-white border p-5" style={{ borderColor: "#e5e7eb" }}>
        <h3 className="text-sm font-bold mb-4" style={{ color: "#111" }}>상세 항목</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "#f9f9f9" }}>
                {["타입", "리소스", "사유"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: "#888" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.items ?? []).slice(0, 10).map((it, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f5f5f5" }}>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded-sm" style={{ background: "#f3f4f6", color: "#555" }}>{it.checkType ?? "-"}</span>
                  </td>
                  <td className="px-3 py-2 font-mono" style={{ color: "#444" }}>{it.resourceType} {it.resourceId}</td>
                  <td className="px-3 py-2" style={{ color: "#666" }}>{it.reason ?? "-"}</td>
                </tr>
              ))}
              {(data.items ?? []).length === 0 && (
                <tr><td colSpan={3} className="px-3 py-4 text-center" style={{ color: "#bbb" }}>항목 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AthenaCard({ queries }: { queries: NonNullable<OpsData["athenaQueries"]> }) {
  const [idx, setIdx] = useState(0);
  if (queries.length === 0) return null;
  const q = queries[((idx % queries.length) + queries.length) % queries.length];
  return (
    <div className="bg-white border p-5" style={{ borderColor: "#e5e7eb" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold" style={{ color: "#111" }}>Athena 쿼리 결과</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setIdx((i) => i - 1)} className="px-2 py-1 text-xs border rounded-sm" style={{ borderColor: "#ddd" }}>◀</button>
          <span className="text-xs font-mono" style={{ color: "#666" }}>[{((idx % queries.length) + queries.length) % queries.length + 1}/{queries.length}] {q.label}</span>
          <button onClick={() => setIdx((i) => i + 1)} className="px-2 py-1 text-xs border rounded-sm" style={{ borderColor: "#ddd" }}>▶</button>
        </div>
      </div>
      <textarea readOnly value={q.sql ?? ""} rows={2}
        className="w-full p-3 text-xs font-mono border rounded-sm mb-2 resize-none"
        style={{ background: "#f9fafb", borderColor: "#e5e7eb", color: "#444" }} />
      {q.error
        ? <p className="text-xs mb-2" style={{ color: "#ef4444" }}>❌ {q.error}</p>
        : <p className="text-xs mb-2" style={{ color: "#10b981" }}>✅ {q.rowCount}건</p>
      }
      {!q.error && (q.rows?.length ?? 0) > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "#f9f9f9" }}>
                {(q.headers ?? []).map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: "#888" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(q.rows ?? []).map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f5f5f5" }}>
                  {(q.headers ?? []).map((h) => (
                    <td key={h} className="px-3 py-2 font-mono" style={{ color: "#444" }}>{row[h] ?? ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReportsCard({ reports }: { reports: NonNullable<OpsData["reports"]> }) {
  return (
    <div className="bg-white border p-5" style={{ borderColor: "#e5e7eb" }}>
      <h3 className="text-sm font-bold mb-4" style={{ color: "#111" }}>최근 자동 생성 리포트</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "#f9f9f9" }}>
              {["날짜", "타입", "제목", "S3"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium" style={{ color: "#888" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reports.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f5f5f5" }}>
                <td className="px-3 py-2 font-mono" style={{ color: "#444" }}>{r.reportDate ?? "-"}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded-sm" style={{ background: "#eff6ff", color: "#1d4ed8" }}>{r.reportType ?? "-"}</span>
                </td>
                <td className="px-3 py-2" style={{ color: "#333" }}>{r.title ?? "-"}</td>
                <td className="px-3 py-2 font-mono truncate max-w-xs" style={{ color: "#aaa" }}>{(r.s3Url ?? "").replace("s3://", "")}</td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-4 text-center" style={{ color: "#bbb" }}>리포트 없음</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type ChatMessage = { role: "user" | "assistant"; content: string; tools?: string[] };

function AIChatCard({ chatApiBase }: { chatApiBase: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: "assistant",
    content: "안녕하세요. 운영 어시스턴트입니다. 한국어로 자유롭게 질의해주세요.\n도구 6개 (대시보드/리소스/알람/메트릭/Athena SQL/리포트 RAG) 자동 호출.",
  }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem(CHAT_SESSION_KEY) ?? "");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  const SAMPLES = ["오늘 미사용 EBS 알려줘", "최근 1시간 ALB 메트릭 어때?", "지난주 RDS 관련 이슈 보고서 있어?", "최근 일주일간 운영 트렌드 알려줘"];

  async function sendChat(text: string) {
    if (busy || !text.trim()) return;
    if (!chatApiBase) {
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ API URL이 설정되지 않았습니다. 관리자에게 문의하세요." }]);
      return;
    }
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "assistant", content: "🤔 분석 중... (20~40초)" }]);
    try {
      const body: Record<string, string> = { input: text };
      if (sessionId) body.session_id = sessionId;
      const res = await fetch(`${chatApiBase.replace(/\/$/, "")}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.session_id) {
        setSessionId(data.session_id);
        localStorage.setItem(CHAT_SESSION_KEY, data.session_id);
      }
      const tools: string[] = [...new Set<string>(
        (data.trace ?? [])
          .filter((m: { tool_calls?: { name: string }[] }) => m.tool_calls)
          .flatMap((m: { tool_calls: { name: string }[] }) => m.tool_calls.map((tc) => tc.name))
      )];
      setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: data.answer ?? "(빈 응답)", tools }]);
    } catch (err) {
      setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: `❌ 오류: ${(err as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white border p-5" style={{ borderColor: "#e5e7eb" }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold" style={{ color: "#111" }}>AI 어시스턴트 (LangGraph V2 — RAG + 멀티턴)</h3>
        <button onClick={() => {
          setMessages([{ role: "assistant", content: "새 세션이 시작되었습니다." }]);
          setSessionId("");
          localStorage.removeItem(CHAT_SESSION_KEY);
        }} className="text-xs" style={{ color: "#aaa" }}>대화 새로 시작</button>
      </div>
      <p className="text-xs mb-3" style={{ color: "#aaa" }}>
        한국어로 자유롭게 질의하세요. 같은 세션에서 후속 질문 가능.
        {sessionId && <span style={{ color: "#10b981" }}> · 세션 활성</span>}
        {!chatApiBase && <span style={{ color: "#ef4444" }}> · API 미설정</span>}
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {SAMPLES.map((s) => (
          <button key={s} onClick={() => sendChat(s)} disabled={busy}
            className="text-xs px-3 py-1 border rounded-full disabled:opacity-40"
            style={{ borderColor: "#ddd", color: "#555" }}>{s}</button>
        ))}
      </div>
      <div ref={logRef} className="space-y-2 max-h-96 overflow-y-auto mb-3 p-3 border rounded-sm"
        style={{ borderColor: "#e5e7eb", background: "#fafafa" }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`px-3 py-2 rounded-sm max-w-2xl text-xs whitespace-pre-wrap ${m.role === "user" ? "bg-purple-100" : "bg-white border"}`}
              style={m.role === "assistant" ? { borderColor: "#e5e7eb" } : {}}>
              {m.tools && m.tools.length > 0 && (
                <p className="text-xs mb-1" style={{ color: "#aaa" }}>🔧 {m.tools.join(", ")}</p>
              )}
              {m.content}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); sendChat(input); }} className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
          placeholder="예: 오늘 미사용 EBS 알려줘"
          className="flex-1 border px-3 py-2 text-xs rounded-sm outline-none disabled:opacity-40"
          style={{ borderColor: "#e5e7eb" }} />
        <button type="submit" disabled={busy || !input.trim()}
          className="px-4 py-2 text-xs font-medium rounded-sm disabled:opacity-40"
          style={{ background: "#7c3aed", color: "#fff" }}>
          {busy ? "..." : "전송"}
        </button>
      </form>
    </div>
  );
}

function RefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-sm"
      style={{ borderColor: "#ddd", color: "#555" }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
        <path d="M8 16H3v5"/>
      </svg>
      새로고침
    </button>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const q = useDebounce(searchInput);
  const SIZE = 20;

  useEffect(() => { setPage(1); }, [q, status]);

  useEffect(() => {
    setLoading(true);
    api.get<{ items: AdminOrder[]; total: number }>("/api/admin/orders", {
      params: { page, size: SIZE, ...(status ? { status } : {}), ...(q ? { q } : {}) },
    }).then((r) => { setOrders(r.data.items); setTotal(r.data.total); }).finally(() => setLoading(false));
  }, [page, status, q, tick]);

  const totalPages = Math.ceil(total / SIZE);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={searchInput} onChange={setSearchInput} placeholder="이름 또는 이메일 검색" />
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="text-sm px-3 py-1.5 border rounded-sm outline-none" style={{ borderColor: "#ddd", color: "#333" }}>
          <option value="">전체 상태</option>
          <option value="SUCCESS">결제완료</option>
          <option value="FAILED">결제실패</option>
          <option value="PENDING">처리중</option>
        </select>
        <span className="text-xs" style={{ color: "#888" }}>총 {total.toLocaleString()}건</span>
        <div className="ml-auto"><RefreshButton onClick={() => setTick((n) => n + 1)} /></div>
      </div>
      <OrderTable orders={orders} loading={loading} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function OrderTable({ orders, loading }: { orders: AdminOrder[]; loading: boolean }) {
  return (
    <div className="bg-white border" style={{ borderColor: "#e5e7eb" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#f9f9f9", borderBottom: "1px solid #f0f0f0" }}>
              {["주문ID", "회원", "금액", "상태", "주문일시"].map((h) => (
                <th key={h} className="px-4 py-2 text-left text-xs font-medium" style={{ color: "#888" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-xs" style={{ color: "#bbb" }}>불러오는 중...</td></tr>
              : orders.map((o) => (
                <tr key={o.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                  <td className="px-4 py-2.5 font-medium" style={{ color: "#111" }}>#{o.id}</td>
                  <td className="px-4 py-2.5" style={{ color: "#444" }}>
                    <div>{o.user_name}</div>
                    <div className="text-xs" style={{ color: "#aaa" }}>{o.email}</div>
                  </td>
                  <td className="px-4 py-2.5 font-medium" style={{ color: "#111" }}>{Number(o.total_price).toLocaleString()}원</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-sm font-medium" style={STATUS_COLOR[o.status] ?? { background: "#f3f4f6", color: "#555" }}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "#aaa" }}>{new Date(o.created_at.includes('+') || o.created_at.endsWith('Z') ? o.created_at : o.created_at + 'Z').toLocaleString("ko-KR")}</td>
                </tr>
              ))}
            {!loading && orders.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-xs" style={{ color: "#bbb" }}>검색 결과 없음</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const q = useDebounce(searchInput);
  const SIZE = 20;

  useEffect(() => { setPage(1); }, [q]);

  useEffect(() => {
    setLoading(true);
    api.get<{ items: AdminUser[]; total: number }>("/api/admin/users", {
      params: { page, size: SIZE, ...(q ? { q } : {}) },
    }).then((r) => { setUsers(r.data.items); setTotal(r.data.total); }).finally(() => setLoading(false));
  }, [page, q, tick]);

  const totalPages = Math.ceil(total / SIZE);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={searchInput} onChange={setSearchInput} placeholder="이름 또는 이메일 검색" />
        <span className="text-xs" style={{ color: "#888" }}>총 {total.toLocaleString()}명</span>
        <div className="ml-auto"><RefreshButton onClick={() => setTick((n) => n + 1)} /></div>
      </div>
      <div className="bg-white border" style={{ borderColor: "#e5e7eb" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#f9f9f9", borderBottom: "1px solid #f0f0f0" }}>
                {["ID", "이름", "이메일", "연락처", "가입일"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-medium" style={{ color: "#888" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-xs" style={{ color: "#bbb" }}>불러오는 중...</td></tr>
                : users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "#888" }}>{u.id}</td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: "#111" }}>{u.name}</td>
                    <td className="px-4 py-2.5" style={{ color: "#444" }}>{u.email}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "#666" }}>{u.phone ?? "-"}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "#aaa" }}>{new Date(u.created_at.includes('+') || u.created_at.endsWith('Z') ? u.created_at : u.created_at + 'Z').toLocaleDateString("ko-KR")}</td>
                  </tr>
                ))}
              {!loading && users.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-xs" style={{ color: "#bbb" }}>검색 결과 없음</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function ProductsTab() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [editStock, setEditStock] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const q = useDebounce(searchInput);
  const SIZE = 20;

  useEffect(() => { setPage(1); }, [q]);

  useEffect(() => {
    setLoading(true);
    api.get<{ items: AdminProduct[]; total: number }>("/api/admin/products", {
      params: { page, size: SIZE, ...(q ? { q } : {}) },
    }).then((r) => { setProducts(r.data.items); setTotal(r.data.total); }).finally(() => setLoading(false));
  }, [page, q, tick]);

  async function handleStockSave(productId: number) {
    const val = parseInt(editStock[productId] ?? "");
    if (isNaN(val) || val < 0) return;
    setSaving(productId);
    try {
      await api.patch(`/api/admin/products/${productId}/stock`, null, { params: { stock_quantity: val } });
      setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, stock_quantity: val } : p));
      setEditStock((prev) => { const n = { ...prev }; delete n[productId]; return n; });
    } finally {
      setSaving(null);
    }
  }

  const totalPages = Math.ceil(total / SIZE);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput value={searchInput} onChange={setSearchInput} placeholder="상품명 또는 브랜드 검색" />
        <span className="text-xs" style={{ color: "#888" }}>총 {total.toLocaleString()}개 상품</span>
        <div className="ml-auto"><RefreshButton onClick={() => setTick((n) => n + 1)} /></div>
      </div>
      <div className="bg-white border" style={{ borderColor: "#e5e7eb" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#f9f9f9", borderBottom: "1px solid #f0f0f0" }}>
                {["ID", "상품명", "브랜드", "카테고리", "가격", "재고", ""].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-medium" style={{ color: "#888" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-xs" style={{ color: "#bbb" }}>불러오는 중...</td></tr>
                : products.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "#888" }}>{p.id}</td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: "#111", maxWidth: 200 }}>
                      <span className="line-clamp-1">{p.name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "#666" }}>{p.brand ?? "-"}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "#666" }}>{p.category}</td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: "#111" }}>{Number(p.price).toLocaleString()}원</td>
                    <td className="px-4 py-2.5">
                      <input type="number" min={0}
                        value={editStock[p.id] ?? p.stock_quantity}
                        onChange={(e) => setEditStock((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-20 px-2 py-1 text-xs border rounded-sm outline-none text-center"
                        style={{ borderColor: editStock[p.id] !== undefined ? "#111" : "#e5e7eb" }} />
                    </td>
                    <td className="px-4 py-2.5">
                      {editStock[p.id] !== undefined && (
                        <button onClick={() => handleStockSave(p.id)} disabled={saving === p.id}
                          className="px-3 py-1 text-xs font-bold rounded-sm disabled:opacity-50"
                          style={{ background: "#111", color: "#fff" }}>
                          {saving === p.id ? "저장중" : "저장"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              {!loading && products.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-xs" style={{ color: "#bbb" }}>검색 결과 없음</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2">
      <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}
        className="px-3 py-1 text-xs border rounded-sm disabled:opacity-40" style={{ borderColor: "#ddd" }}>이전</button>
      <span className="text-xs" style={{ color: "#666" }}>{page} / {totalPages}</span>
      <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}
        className="px-3 py-1 text-xs border rounded-sm disabled:opacity-40" style={{ borderColor: "#ddd" }}>다음</button>
    </div>
  );
}

const GRAFANA_DASHBOARDS = [
  {
    title: "Kubernetes 클러스터 리소스",
    url: `${GRAFANA_URL}/d/efa86fd1d0c121a26444b636a3f509a8/kubernetes-compute-resources-cluster?orgId=1&kiosk&theme=light`,
  },
  {
    title: "Kubernetes 네임스페이스별 리소스",
    url: `${GRAFANA_URL}/d/85a562078cdf77779eaa1add43ccec1e/kubernetes-compute-resources-namespace-pods?orgId=1&var-namespace=fiveline&kiosk&theme=light`,
  },
  {
    title: "Kubernetes Pod 상세",
    url: `${GRAFANA_URL}/d/6581e46e4e5c7ba40a07646395ef7b23/kubernetes-compute-resources-pod?orgId=1&var-namespace=fiveline&kiosk&theme=light`,
  },
];

type SonarMeasure = { metric: string; value: string };
type SonarProject = { name: string; key: string; measures: SonarMeasure[] };

const SONAR_PROJECTS = [
  { key: "mzc-pj4_fiveline-frontend", name: "Frontend" },
  { key: "mzc-pj4_fiveline-backend", name: "Backend" },
];
const SONAR_METRICS = "alert_status,bugs,vulnerabilities,code_smells,security_rating";

const SECURITY_GRADE: Record<string, string> = { "1": "A", "2": "B", "3": "C", "4": "D", "5": "E" };
const SECURITY_COLOR: Record<string, string> = { "1": "#065f46", "2": "#166534", "3": "#92400e", "4": "#991b1b", "5": "#7f1d1d" };
const SECURITY_BG: Record<string, string> = { "1": "#ecfdf5", "2": "#dcfce7", "3": "#fffbeb", "4": "#fef2f2", "5": "#fef2f2" };

function useSonarCloud() {
  const [projects, setProjects] = useState<SonarProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = import.meta.env.VITE_SONAR_TOKEN ?? "";
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all(
      SONAR_PROJECTS.map((p) =>
        fetch(`/sonar-api/measures/component?component=${p.key}&metricKeys=${SONAR_METRICS}`, { headers })
          .then((r) => r.json())
          .then((data) => ({ name: p.name, key: p.key, measures: data.component?.measures ?? [] }))
          .catch(() => ({ name: p.name, key: p.key, measures: [] }))
      )
    )
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  return { projects, loading };
}

function SonarCloudSection() {
  const { projects, loading } = useSonarCloud();

  const getMeasure = (measures: SonarMeasure[], key: string) =>
    measures.find((m) => m.metric === key)?.value ?? "-";

  return (
    <div className="bg-white border p-5" style={{ borderColor: "#e5e7eb" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold" style={{ color: "#111" }}>🔍 코드 품질 (SonarCloud)</h3>
        <a
          href="https://sonarcloud.io/organizations/mzc-pj4/projects"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 border rounded-sm"
          style={{ borderColor: "#ddd", color: "#555" }}
        >
          SonarCloud 전체 화면 ↗
        </a>
      </div>

      {loading ? (
        <p className="text-xs" style={{ color: "#bbb" }}>불러오는 중...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projects.map((p) => {
            const gate = getMeasure(p.measures, "alert_status");
            const bugs = getMeasure(p.measures, "bugs");
            const vulns = getMeasure(p.measures, "vulnerabilities");
            const smells = getMeasure(p.measures, "code_smells");
            const secRating = getMeasure(p.measures, "security_rating");

            return (
              <div key={p.key} className="border p-4" style={{ borderColor: "#e5e7eb" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold" style={{ color: "#111" }}>{p.name}</span>
                  <span
                    className="text-xs px-2 py-0.5 font-medium rounded-sm"
                    style={{
                      background: gate === "OK" ? "#ecfdf5" : gate === "-" ? "#f3f4f6" : "#fef2f2",
                      color: gate === "OK" ? "#065f46" : gate === "-" ? "#999" : "#991b1b",
                    }}
                  >
                    {gate === "OK" ? "✅ Passed" : gate === "-" ? "데이터 없음" : "❌ Failed"}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-lg font-black" style={{ color: "#111" }}>{bugs}</p>
                    <p className="text-xs" style={{ color: "#999" }}>버그</p>
                  </div>
                  <div>
                    <p className="text-lg font-black" style={{ color: "#111" }}>{vulns}</p>
                    <p className="text-xs" style={{ color: "#999" }}>취약점</p>
                  </div>
                  <div>
                    <p className="text-lg font-black" style={{ color: "#111" }}>{smells}</p>
                    <p className="text-xs" style={{ color: "#999" }}>코드스멜</p>
                  </div>
                  <div>
                    <span
                      className="inline-block text-lg font-black px-2 rounded-sm"
                      style={{
                        color: SECURITY_COLOR[secRating] ?? "#999",
                        background: SECURITY_BG[secRating] ?? "#f3f4f6",
                      }}
                    >
                      {SECURITY_GRADE[secRating] ?? "-"}
                    </span>
                    <p className="text-xs" style={{ color: "#999" }}>보안등급</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CodeQualityTab() {
  return (
    <div className="space-y-6">
      <SonarCloudSection />
      <AIOpsSection />
    </div>
  );
}

type AIOpsDeployment = {
  service_name: string;
  deployed_at: string;
  image_tag: string;
  total_requests: number;
  error_count: number;
  error_rate: number;
  error_4xx_count?: number;
  error_4xx_rate?: number;
  p99_latency_ms: number;
  risk_level?: string;
  risk_reason?: string;
  trivy_critical?: number;
  trivy_high?: number;
  trivy_medium?: number;
  trivy_low?: number;
  ai_status: string;
  ai_recommendation: string;
  ai_reason: string;
};

const AI_STATUS_STYLE: Record<string, { bg: string; color: string; emoji: string }> = {
  정상: { bg: "#ecfdf5", color: "#065f46", emoji: "🟢" },
  경고: { bg: "#fffbeb", color: "#92400e", emoji: "🟡" },
  위험: { bg: "#fef2f2", color: "#991b1b", emoji: "🔴" },
};

const RISK_STYLE: Record<string, { bg: string; color: string }> = {
  "낮음": { bg: "#ecfdf5", color: "#065f46" },
  "중간": { bg: "#fffbeb", color: "#92400e" },
  "높음": { bg: "#fef2f2", color: "#991b1b" },
};

const SERVICES_LIST = [
  { key: "order-service", label: "주문" },
  { key: "product-service", label: "상품" },
  { key: "user-service", label: "회원" },
] as const;

const MIN_REQUESTS_THRESHOLD = 100;

const CW_BASE = "https://ap-northeast-2.console.aws.amazon.com/cloudwatch/home?region=ap-northeast-2";

function buildCloudWatchUrl(deployedAt: string, serviceName: string) {
  const t = new Date(deployedAt).getTime();
  const startSec = Math.floor((t - 2 * 60 * 1000) / 1000);
  const endSec = Math.floor((t + 10 * 60 * 1000) / 1000);
  const logGroup = encodeURIComponent(`/aws/containerinsights/fiveline/${serviceName}`);
  return `${CW_BASE}#logsV2:log-groups/log-group/${logGroup};start=${startSec};end=${endSec}`;
}

function DeltaBadge({ current, prev, unit = "", lowerIsBetter = false }: {
  current: number; prev: number; unit?: string; lowerIsBetter?: boolean;
}) {
  const diff = current - prev;
  if (Math.abs(diff) < 0.001) return null;
  const improved = lowerIsBetter ? diff < 0 : diff > 0;
  const arrow = diff > 0 ? "▲" : "▼";
  const formatted = Math.abs(diff) < 1 ? Math.abs(diff).toFixed(2) : Math.round(Math.abs(diff)).toLocaleString();
  return (
    <span className="text-xs ml-1 font-normal" style={{ color: improved ? "#065f46" : "#991b1b" }}>
      {arrow} {formatted}{unit}
    </span>
  );
}

function RolloutActionModal({ action, serviceName, onConfirm, onCancel, loading }: {
  action: "promote" | "abort";
  serviceName: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="bg-white border p-6 max-w-sm w-full mx-4" style={{ borderColor: "#e5e7eb" }}>
        <h3 className="text-sm font-bold mb-2" style={{ color: "#111" }}>
          {action === "promote" ? "🚀 카나리 배포 승인" : "⏪ 카나리 배포 롤백"}
        </h3>
        <p className="text-xs mb-1" style={{ color: "#666" }}>
          서비스: <strong>{serviceName}</strong>
        </p>
        <p className="text-xs mb-4" style={{ color: "#666" }}>
          {action === "promote"
            ? "카나리 트래픽을 100%로 승인(Promote)합니다. 계속하시겠습니까?"
            : "카나리를 중단하고 이전 버전으로 롤백(Abort)합니다. 계속하시겠습니까?"}
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} disabled={loading}
            className="px-4 py-1.5 text-xs border rounded-sm disabled:opacity-50"
            style={{ borderColor: "#ddd", color: "#555" }}>
            취소
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="px-4 py-1.5 text-xs font-bold rounded-sm disabled:opacity-50"
            style={{ background: action === "promote" ? "#111" : "#991b1b", color: "#fff" }}>
            {loading ? "처리중..." : action === "promote" ? "승인" : "롤백"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AIOpsSection() {
  const [selectedService, setSelectedService] = useState<string>("order-service");
  const [items, setItems] = useState<AIOpsDeployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [feedback, setFeedback] = useState<Record<string, "positive" | "negative">>({});
  const [feedbackSending, setFeedbackSending] = useState<Record<string, boolean>>({});
  const [confirmAction, setConfirmAction] = useState<{ action: "promote" | "abort" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setLoading(true);
    setItems([]);
    api.get<{ items: AIOpsDeployment[] }>(`/api/admin/aiops/deployments?service=${selectedService}&limit=10`)
      .then((r) => setItems(r.data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [selectedService, tick]);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleFeedback(itemKey: string, vote: "positive" | "negative") {
    if (feedback[itemKey] || feedbackSending[itemKey]) return;
    setFeedbackSending((prev) => ({ ...prev, [itemKey]: true }));
    try {
      await api.post("/api/admin/aiops/feedback", { service_name: selectedService, deployed_at: itemKey, feedback: vote });
    } catch { /* 피드백은 실패해도 UI 반영 */ }
    setFeedback((prev) => ({ ...prev, [itemKey]: vote }));
    setFeedbackSending((prev) => ({ ...prev, [itemKey]: false }));
  }

  async function handleRolloutAction() {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      await api.post("/api/admin/cicd/rollout-action", { service_name: selectedService, action: confirmAction.action });
      showToast(
        confirmAction.action === "promote" ? "카나리 배포 승인 요청이 전송되었습니다." : "롤백 요청이 전송되었습니다.",
        "success"
      );
    } catch {
      showToast("요청 처리 중 오류가 발생했습니다.", "error");
    }
    setActionLoading(false);
    setConfirmAction(null);
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 text-xs font-medium"
          style={{ background: toast.type === "success" ? "#065f46" : "#991b1b", color: "#fff" }}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold" style={{ color: "#111" }}>카나리 배포 AIOps 분석 이력</h2>
          <p className="text-xs mt-0.5" style={{ color: "#999" }}>배포 후 Bedrock이 분석한 결과 (최근 10건)</p>
        </div>
        <RefreshButton onClick={() => setTick((n) => n + 1)} />
      </div>

      {/* 서비스 탭 */}
      <div className="flex gap-1">
        {SERVICES_LIST.map(({ key, label }) => (
          <button key={key} onClick={() => setSelectedService(key)}
            className="px-4 py-1.5 text-xs font-medium border rounded-sm transition-colors"
            style={{
              background: selectedService === key ? "#111" : "#fff",
              color: selectedService === key ? "#fff" : "#555",
              borderColor: selectedService === key ? "#111" : "#ddd",
            }}>
            {label} 서비스
          </button>
        ))}
      </div>

      {confirmAction && (
        <RolloutActionModal
          action={confirmAction.action}
          serviceName={selectedService}
          onConfirm={handleRolloutAction}
          onCancel={() => setConfirmAction(null)}
          loading={actionLoading}
        />
      )}

      {loading ? (
        <p className="text-sm" style={{ color: "#bbb" }}>불러오는 중...</p>
      ) : items.length === 0 ? (
        <div className="bg-white border p-10 text-center" style={{ borderColor: "#e5e7eb" }}>
          <p className="text-sm" style={{ color: "#bbb" }}>분석 이력이 없습니다.</p>
          <p className="text-xs mt-1" style={{ color: "#ccc" }}>{selectedService} 배포 후 post-canary-analysis job이 완료되면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const prevItem = items[idx + 1] ?? null;
            const style = AI_STATUS_STYLE[item.ai_status] ?? { bg: "#f3f4f6", color: "#555", emoji: "⚪" };
            const deployedKr = new Date(item.deployed_at).toLocaleString("ko-KR");
            const shortTag = item.image_tag.length > 30 ? item.image_tag.slice(0, 30) + "..." : item.image_tag;
            const isLowTraffic = item.total_requests < MIN_REQUESTS_THRESHOLD;
            const itemKey = item.deployed_at;
            const fbState = feedback[itemKey];
            const riskStyle = RISK_STYLE[item.risk_level ?? ""] ?? { bg: "#f3f4f6", color: "#888" };

            const hasTrivyData = item.trivy_critical !== undefined;
            const trivyCritical = item.trivy_critical ?? 0;
            const trivyHigh = item.trivy_high ?? 0;
            const trivyMedium = item.trivy_medium ?? 0;
            const trivyLow = item.trivy_low ?? 0;
            const trivyTotal = trivyCritical + trivyHigh + trivyMedium + trivyLow;
            const error4xxRate = item.error_4xx_rate ?? 0;
            const error4xxCount = item.error_4xx_count ?? 0;
            const cwUrl = buildCloudWatchUrl(item.deployed_at, selectedService);

            return (
              <div key={itemKey} className="bg-white border p-5" style={{ borderColor: "#e5e7eb" }}>
                {/* 헤더 */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold" style={{ color: "#111" }}>{item.service_name}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "#f3f4f6", color: "#555" }}>{shortTag}</span>
                    </div>
                    <p className="text-xs" style={{ color: "#aaa" }}>{deployedKr}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {item.risk_level && (
                      <span className="text-xs px-2.5 py-1 rounded-sm font-medium" style={{ background: riskStyle.bg, color: riskStyle.color }}>
                        위험도 {item.risk_level}
                      </span>
                    )}
                    <span className="text-xs px-2.5 py-1 rounded-sm font-bold" style={{ background: style.bg, color: style.color }}>
                      {style.emoji} {item.ai_status}
                    </span>
                    {/* 액션 버튼 */}
                    {item.ai_recommendation === "계속진행" ? (
                      <button
                        onClick={() => setConfirmAction({ action: "promote" })}
                        className="text-xs px-2.5 py-1 border rounded-sm font-medium"
                        style={{ borderColor: "#111", color: "#111" }}>
                        🚀 카나리 승인
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmAction({ action: "abort" })}
                        className="text-xs px-2.5 py-1 border rounded-sm font-medium"
                        style={{ borderColor: "#991b1b", color: "#991b1b" }}>
                        ⏪ 롤백
                      </button>
                    )}
                  </div>
                </div>

                {/* 저트래픽 경고 */}
                {isLowTraffic && (
                  <div className="flex items-center gap-2 mb-3 p-2.5 rounded"
                    style={{ background: "#fffbeb", border: "1px solid #fcd34d" }}>
                    <span style={{ fontSize: 14 }}>⚠️</span>
                    <p className="text-xs" style={{ color: "#92400e" }}>
                      <strong>낮은 트래픽 주의:</strong> 총 {item.total_requests}건으로 통계적으로 유의미하지 않을 수 있습니다.
                      (권장: {MIN_REQUESTS_THRESHOLD}건 이상) AI 판단을 참고 용도로만 활용하세요.
                    </p>
                  </div>
                )}

                {/* 메트릭 4열 + 베이스라인 비교 */}
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div className="p-3 rounded" style={{ background: "#f9fafb" }}>
                    <p className="text-xs mb-0.5" style={{ color: "#999" }}>총 요청</p>
                    <p className="text-base font-bold" style={{ color: "#111" }}>
                      {item.total_requests.toLocaleString()}건
                      {prevItem && <DeltaBadge current={item.total_requests} prev={prevItem.total_requests} unit="건" />}
                    </p>
                    {prevItem && <p className="text-xs mt-0.5" style={{ color: "#ccc" }}>이전: {prevItem.total_requests.toLocaleString()}건</p>}
                  </div>
                  <div className="p-3 rounded" style={{ background: item.error_rate > 5 ? "#fef2f2" : "#f9fafb" }}>
                    <p className="text-xs mb-0.5" style={{ color: "#999" }}>5xx 에러율</p>
                    <p className="text-base font-bold" style={{ color: item.error_rate > 5 ? "#991b1b" : "#111" }}>
                      {item.error_rate.toFixed(2)}%
                      {prevItem && <DeltaBadge current={item.error_rate} prev={prevItem.error_rate} unit="%" lowerIsBetter />}
                    </p>
                    <p className="text-xs mt-0.5">
                      <a href={cwUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#6366f1" }}>
                        {item.error_count}건 → CloudWatch ↗
                      </a>
                      {prevItem && <span style={{ color: "#ccc" }}> | 이전: {prevItem.error_rate.toFixed(2)}%</span>}
                    </p>
                  </div>
                  <div className="p-3 rounded" style={{ background: error4xxRate > 20 ? "#fffbeb" : "#f9fafb" }}>
                    <p className="text-xs mb-0.5" style={{ color: "#999" }}>4xx 에러율</p>
                    <p className="text-base font-bold" style={{ color: error4xxRate > 20 ? "#92400e" : "#111" }}>
                      {error4xxRate.toFixed(2)}%
                      {prevItem && <DeltaBadge current={error4xxRate} prev={prevItem.error_4xx_rate ?? 0} unit="%" lowerIsBetter />}
                    </p>
                    <p className="text-xs mt-0.5">
                      <a href={cwUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#6366f1" }}>
                        {error4xxCount}건 → CloudWatch ↗
                      </a>
                      {prevItem && <span style={{ color: "#ccc" }}> | 이전: {(prevItem.error_4xx_rate ?? 0).toFixed(2)}%</span>}
                    </p>
                  </div>
                  <div className="p-3 rounded" style={{ background: item.p99_latency_ms > 1000 ? "#fffbeb" : "#f9fafb" }}>
                    <p className="text-xs mb-0.5" style={{ color: "#999" }}>P99 응답시간</p>
                    <p className="text-base font-bold" style={{ color: item.p99_latency_ms > 1000 ? "#92400e" : "#111" }}>
                      {item.p99_latency_ms.toLocaleString()}ms
                      {prevItem && <DeltaBadge current={item.p99_latency_ms} prev={prevItem.p99_latency_ms} unit="ms" lowerIsBetter />}
                    </p>
                    {prevItem && <p className="text-xs mt-0.5" style={{ color: "#ccc" }}>이전: {prevItem.p99_latency_ms.toLocaleString()}ms</p>}
                  </div>
                </div>

                {/* Trivy 보안 스캔 */}
                {hasTrivyData && (
                  <div className="flex items-center gap-2 mb-3 p-3 rounded"
                    style={{ background: trivyCritical > 0 ? "#fef2f2" : trivyHigh > 0 ? "#fffbeb" : "#f0fdf4" }}>
                    <span className="text-xs font-medium shrink-0" style={{ color: "#666" }}>이미지 보안 스캔</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { label: "CRITICAL", count: trivyCritical, color: trivyCritical > 0 ? "#991b1b" : "#aaa", bg: trivyCritical > 0 ? "#fef2f2" : "#f3f4f6" },
                        { label: "HIGH", count: trivyHigh, color: trivyHigh > 0 ? "#92400e" : "#aaa", bg: trivyHigh > 0 ? "#fffbeb" : "#f3f4f6" },
                        { label: "MEDIUM", count: trivyMedium, color: trivyMedium > 0 ? "#1e40af" : "#aaa", bg: trivyMedium > 0 ? "#eff6ff" : "#f3f4f6" },
                        { label: "LOW", count: trivyLow, color: "#aaa", bg: "#f3f4f6" },
                      ].map(({ label, count, color, bg }) => (
                        <span key={label} className="text-xs px-2 py-0.5 rounded font-mono font-bold" style={{ background: bg, color }}>
                          {label} {count}
                        </span>
                      ))}
                      {trivyTotal === 0 && <span className="text-xs" style={{ color: "#065f46" }}>취약점 없음 ✓</span>}
                    </div>
                  </div>
                )}

                {/* AI 판단 근거 + 피드백 */}
                <div className="p-3 rounded" style={{ background: "#f9fafb" }}>
                  <p className="text-xs font-medium mb-1" style={{ color: "#666" }}>AI 판단 근거</p>
                  <p className="text-sm" style={{ color: "#444" }}>{item.ai_reason}</p>
                  {item.risk_reason && (
                    <p className="text-xs mt-1" style={{ color: "#888" }}>배포 위험: {item.risk_reason}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: "1px solid #f0f0f0" }}>
                    <span className="text-xs" style={{ color: "#bbb" }}>AI 판단이 유용했나요?</span>
                    {fbState ? (
                      <span className="text-xs" style={{ color: "#888" }}>
                        {fbState === "positive" ? "👍 도움이 됐어요" : "👎 개선이 필요해요"} · 피드백 감사합니다
                      </span>
                    ) : (
                      <>
                        <button onClick={() => handleFeedback(itemKey, "positive")} disabled={feedbackSending[itemKey]}
                          className="text-xs px-2 py-0.5 border rounded-sm disabled:opacity-50"
                          style={{ borderColor: "#e5e7eb", color: "#555" }}>
                          👍 유용함
                        </button>
                        <button onClick={() => handleFeedback(itemKey, "negative")} disabled={feedbackSending[itemKey]}
                          className="text-xs px-2 py-0.5 border rounded-sm disabled:opacity-50"
                          style={{ borderColor: "#e5e7eb", color: "#555" }}>
                          👎 부정확함
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MonitoringTab() {
  const [selected, setSelected] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {GRAFANA_DASHBOARDS.map((d, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className="px-4 py-1.5 text-xs font-medium border rounded-sm transition-colors"
            style={{
              background: selected === i ? "#111" : "#fff",
              color: selected === i ? "#fff" : "#555",
              borderColor: selected === i ? "#111" : "#ddd",
            }}
          >
            {d.title}
          </button>
        ))}
        <a
          href={GRAFANA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto px-3 py-1.5 text-xs border rounded-sm"
          style={{ borderColor: "#ddd", color: "#555" }}
        >
          Grafana 전체 화면 ↗
        </a>
      </div>

      <div className="bg-white border" style={{ borderColor: "#e5e7eb" }}>
        <iframe
          src={GRAFANA_DASHBOARDS[selected].url}
          width="100%"
          height="700"
          frameBorder="0"
          title={GRAFANA_DASHBOARDS[selected].title}
        />
      </div>
    </div>
  );
}
