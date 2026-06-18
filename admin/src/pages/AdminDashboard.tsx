import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { clearAdminSession, getAdminUser } from "../auth";

type DashboardData = {
  total_orders: number; total_revenue: number;
  total_users: number; total_products: number;
  orders_by_status: { status: string; count: number }[];
  top_products: { name: string; sold_count: number }[];
  recent_orders: AdminOrder[];
};
type AdminOrder = { id: number; total_price: number; status: string; created_at: string; email: string; user_name: string };
type AdminUser = { id: number; email: string; name: string; role: string; phone: string | null; created_at: string };
type AdminProduct = { id: number; name: string; category: string; brand: string | null; price: number; stock_quantity: number };

const TABS = ["대시보드", "주문관리", "사용자", "상품관리", "모니터링", "코드품질"] as const;
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
        {tab === "코드품질" && <CodeQualityTab />}
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
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get<DashboardData>("/api/admin/dashboard").then((r) => {
      const d = r.data;
      setData({
        total_orders: d.total_orders ?? 0,
        total_revenue: d.total_revenue ?? 0,
        total_users: d.total_users ?? 0,
        total_products: d.total_products ?? 0,
        orders_by_status: d.orders_by_status ?? [],
        top_products: d.top_products ?? [],
        recent_orders: d.recent_orders ?? [],
      });
    }).finally(() => setLoading(false));
  }, [tick]);

  if (loading) return <p className="text-sm" style={{ color: "#bbb" }}>불러오는 중...</p>;
  if (!data) return <p className="text-sm" style={{ color: "#f00" }}>데이터를 불러올 수 없습니다.</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <RefreshButton onClick={() => setTick((n) => n + 1)} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="총 주문 수" value={(data.total_orders ?? 0).toLocaleString()} />
        <KpiCard label="총 매출" value={`${Math.round(data.total_revenue ?? 0).toLocaleString()}원`} />
        <KpiCard label="회원 수" value={(data.total_users ?? 0).toLocaleString()} />
        <KpiCard label="상품 수" value={(data.total_products ?? 0).toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white border p-5" style={{ borderColor: "#e5e7eb" }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: "#111" }}>주문 상태별 현황</h3>
          <div className="space-y-2">
            {data.orders_by_status.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <span className="text-xs px-2 py-0.5 font-medium rounded-sm" style={STATUS_COLOR[s.status] ?? { background: "#f3f4f6", color: "#555" }}>
                  {STATUS_LABEL[s.status] ?? s.status}
                </span>
                <span className="text-sm font-bold" style={{ color: "#111" }}>{s.count}건</span>
              </div>
            ))}
            {data.orders_by_status.length === 0 && <p className="text-xs" style={{ color: "#bbb" }}>주문 없음</p>}
          </div>
        </div>

        <div className="bg-white border p-5" style={{ borderColor: "#e5e7eb" }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: "#111" }}>인기 상품 Top 5</h3>
          <ol className="space-y-2">
            {data.top_products.map((p, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-5 text-xs font-bold" style={{ color: i < 3 ? "#f59e0b" : "#bbb" }}>{i + 1}</span>
                  <span className="line-clamp-1" style={{ color: "#333", maxWidth: 180 }}>{p.name}</span>
                </div>
                <span className="font-medium" style={{ color: "#666" }}>{p.sold_count}개</span>
              </li>
            ))}
            {data.top_products.length === 0 && <p className="text-xs" style={{ color: "#bbb" }}>판매 데이터 없음</p>}
          </ol>
        </div>
      </div>

      <div className="bg-white border" style={{ borderColor: "#e5e7eb" }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: "#f0f0f0", background: "#fafafa" }}>
          <h3 className="text-sm font-bold" style={{ color: "#111" }}>최근 주문 10건</h3>
        </div>
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
              {data.recent_orders.map((o) => (
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
              {data.recent_orders.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-xs" style={{ color: "#bbb" }}>주문 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
    url: `${GRAFANA_URL}/d/efa86fd1d0c121a26444b636a3f509a8/kubernetes-compute-resources-cluster?orgId=1&kiosk`,
  },
  {
    title: "Kubernetes 네임스페이스별 리소스",
    url: `${GRAFANA_URL}/d/85a562078cdf77779eaa1add43ccec1e/kubernetes-compute-resources-namespace-pods?orgId=1&var-namespace=fiveline&kiosk`,
  },
  {
    title: "Kubernetes Pod 상세",
    url: `${GRAFANA_URL}/d/6581e46e4e5c7ba40a07646395ef7b23/kubernetes-compute-resources-pod?orgId=1&var-namespace=fiveline&kiosk`,
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

function AIOpsSection() {
  const [items, setItems] = useState<AIOpsDeployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get<{ items: AIOpsDeployment[] }>("/api/admin/aiops/deployments?service=order-service&limit=10")
      .then((r) => setItems(r.data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [tick]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold" style={{ color: "#111" }}>카나리 배포 AIOps 분석 이력</h2>
          <p className="text-xs mt-0.5" style={{ color: "#999" }}>order-service 배포 후 Bedrock이 분석한 결과 (최근 10건)</p>
        </div>
        <RefreshButton onClick={() => setTick((n) => n + 1)} />
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "#bbb" }}>불러오는 중...</p>
      ) : items.length === 0 ? (
        <div className="bg-white border p-10 text-center" style={{ borderColor: "#e5e7eb" }}>
          <p className="text-sm" style={{ color: "#bbb" }}>분석 이력이 없습니다.</p>
          <p className="text-xs mt-1" style={{ color: "#ccc" }}>order-service 배포 후 post-canary-analysis job이 완료되면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const style = AI_STATUS_STYLE[item.ai_status] ?? { bg: "#f3f4f6", color: "#555", emoji: "⚪" };
            const deployedKr = new Date(item.deployed_at).toLocaleString("ko-KR");
            const shortTag = item.image_tag.length > 30 ? item.image_tag.slice(0, 30) + "..." : item.image_tag;

            const hasTrivyData = item.trivy_critical !== undefined;
            const trivyCritical = item.trivy_critical ?? 0;
            const trivyHigh = item.trivy_high ?? 0;
            const trivyMedium = item.trivy_medium ?? 0;
            const trivyLow = item.trivy_low ?? 0;
            const trivyTotal = trivyCritical + trivyHigh + trivyMedium + trivyLow;
            const error4xxRate = item.error_4xx_rate ?? 0;
            const error4xxCount = item.error_4xx_count ?? 0;

            const RISK_STYLE: Record<string, { bg: string; color: string }> = {
              "낮음": { bg: "#ecfdf5", color: "#065f46" },
              "중간": { bg: "#fffbeb", color: "#92400e" },
              "높음": { bg: "#fef2f2", color: "#991b1b" },
            };
            const riskStyle = RISK_STYLE[item.risk_level ?? ""] ?? { bg: "#f3f4f6", color: "#888" };

            return (
              <div key={item.deployed_at} className="bg-white border p-5" style={{ borderColor: "#e5e7eb" }}>
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
                    <span className="text-xs px-2.5 py-1 border rounded-sm font-medium" style={{ borderColor: "#e5e7eb", color: "#555" }}>
                      {item.ai_recommendation}
                    </span>
                  </div>
                </div>

                {/* 메트릭 4열 */}
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div className="p-3 rounded" style={{ background: "#f9fafb" }}>
                    <p className="text-xs mb-0.5" style={{ color: "#999" }}>총 요청</p>
                    <p className="text-base font-bold" style={{ color: "#111" }}>{item.total_requests.toLocaleString()}건</p>
                  </div>
                  <div className="p-3 rounded" style={{ background: item.error_rate > 5 ? "#fef2f2" : "#f9fafb" }}>
                    <p className="text-xs mb-0.5" style={{ color: "#999" }}>5xx 에러율</p>
                    <p className="text-base font-bold" style={{ color: item.error_rate > 5 ? "#991b1b" : "#111" }}>
                      {item.error_rate.toFixed(2)}%
                      <span className="text-xs font-normal ml-1" style={{ color: "#aaa" }}>({item.error_count}건)</span>
                    </p>
                  </div>
                  <div className="p-3 rounded" style={{ background: error4xxRate > 20 ? "#fffbeb" : "#f9fafb" }}>
                    <p className="text-xs mb-0.5" style={{ color: "#999" }}>4xx 에러율</p>
                    <p className="text-base font-bold" style={{ color: error4xxRate > 20 ? "#92400e" : "#111" }}>
                      {error4xxRate.toFixed(2)}%
                      <span className="text-xs font-normal ml-1" style={{ color: "#aaa" }}>({error4xxCount}건)</span>
                    </p>
                  </div>
                  <div className="p-3 rounded" style={{ background: item.p99_latency_ms > 1000 ? "#fffbeb" : "#f9fafb" }}>
                    <p className="text-xs mb-0.5" style={{ color: "#999" }}>P99 응답시간</p>
                    <p className="text-base font-bold" style={{ color: item.p99_latency_ms > 1000 ? "#92400e" : "#111" }}>
                      {item.p99_latency_ms.toLocaleString()}ms
                    </p>
                  </div>
                </div>

                {/* Trivy 보안 스캔 */}
                {hasTrivyData && (
                  <div className="flex items-center gap-2 mb-3 p-3 rounded" style={{ background: trivyCritical > 0 ? "#fef2f2" : trivyHigh > 0 ? "#fffbeb" : "#f0fdf4" }}>
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

                {/* AI 판단 근거 */}
                <div className="p-3 rounded" style={{ background: "#f9fafb" }}>
                  <p className="text-xs font-medium mb-1" style={{ color: "#666" }}>AI 판단 근거</p>
                  <p className="text-sm" style={{ color: "#444" }}>{item.ai_reason}</p>
                  {item.risk_reason && (
                    <p className="text-xs mt-1" style={{ color: "#888" }}>배포 위험: {item.risk_reason}</p>
                  )}
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
