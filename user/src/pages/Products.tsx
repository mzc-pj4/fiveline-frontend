import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ProductList, productApi } from "../api";
import { ProductCard } from "./Home";

const SKELETON_KEYS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const CATEGORIES = ["상의", "하의", "아우터", "원피스/스커트", "신발", "가방", "소품"];
const SORT_OPTIONS = [
  { value: "newest", label: "최신순" },
  { value: "price_asc", label: "낮은 가격순" },
  { value: "price_desc", label: "높은 가격순" },
];

export default function Products() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get("category") ?? "";
  const brand = searchParams.get("brand") ?? "";
  const q = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? "newest";
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);

  const [data, setData] = useState<ProductList | null>(null);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<string[]>([]);

  useEffect(() => {
    productApi.get<string[]>("/api/products/brands", { params: { limit: 30 } })
      .then(({ data: d }) => setBrands(d ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { sort, page, size: 20 };
    if (category) params.category = category;
    if (brand) params.brand = brand;
    if (q) params.q = q;

    productApi.get<ProductList>("/api/products", { params })
      .then(({ data: d }) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [category, brand, q, sort, page]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setSearchParams(next);
  }

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  const nonLoadingContent = !data || data.items.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-24" style={{ color: "#bbb" }}>
      <p className="text-5xl mb-4">🔍</p>
      <p className="text-base font-medium">상품이 없습니다</p>
      <button
        onClick={() => navigate("/products")}
        className="mt-4 text-sm underline"
        style={{ color: "#666" }}
      >
        전체 상품 보기
      </button>
    </div>
  ) : (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-8">
        {data.items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button
            disabled={page <= 1}
            onClick={() => setParam("page", String(page - 1))}
            className="w-9 h-9 flex items-center justify-center border rounded text-sm disabled:opacity-30"
            style={{ borderColor: "#ddd" }}
          >
            ←
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((n) => Math.abs(n - page) <= 2 || n === 1 || n === totalPages)
            .reduce<(number | "...")[]>((acc, n, i, arr) => {
              if (i > 0 && n - arr[i - 1] > 1) acc.push("...");
              acc.push(n);
              return acc;
            }, [])
            .map((n, i, arr) =>
              n === "..." ? (
                <span key={`ellipsis-after-${arr[i - 1]}`} className="w-9 h-9 flex items-center justify-center text-sm" style={{ color: "#bbb" }}>…</span>
              ) : (
                <button
                  key={n}
                  onClick={() => setParam("page", String(n))}
                  className="w-9 h-9 flex items-center justify-center border rounded text-sm font-medium transition-colors"
                  style={{ background: page === n ? "#000" : "#fff", color: page === n ? "#fff" : "#333", borderColor: page === n ? "#000" : "#ddd" }}
                >
                  {n}
                </button>
              )
            )}
          <button
            disabled={page >= totalPages}
            onClick={() => setParam("page", String(page + 1))}
            className="w-9 h-9 flex items-center justify-center border rounded text-sm disabled:opacity-30"
            style={{ borderColor: "#ddd" }}
          >
            →
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {q && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm" style={{ color: "#666" }}>
            &quot;{q}&quot; 검색 결과
          </span>
          <button
            onClick={() => setParam("q", "")}
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "#000", color: "#fff" }}
          >
            ✕ 초기화
          </button>
        </div>
      )}

      <div className="flex gap-0 border-b mb-4 overflow-x-auto">
        <button
          onClick={() => setParam("category", "")}
          className="px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
          style={{ borderColor: category === "" ? "#000" : "transparent", color: category === "" ? "#000" : "#888" }}
        >
          전체
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setParam("category", cat)}
            className="px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
            style={{ borderColor: category === cat ? "#000" : "transparent", color: category === cat ? "#000" : "#888" }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        <button
          onClick={() => setParam("brand", "")}
          className="px-3 py-1.5 text-xs font-medium rounded-full border whitespace-nowrap transition-colors"
          style={{ background: brand === "" ? "#000" : "#fff", color: brand === "" ? "#fff" : "#555", borderColor: brand === "" ? "#000" : "#ddd" }}
        >
          전체 브랜드
        </button>
        {brands.map((b) => (
          <button
            key={b}
            onClick={() => setParam("brand", b)}
            className="px-3 py-1.5 text-xs font-medium rounded-full border whitespace-nowrap transition-colors"
            style={{ background: brand === b ? "#000" : "#fff", color: brand === b ? "#fff" : "#555", borderColor: brand === b ? "#000" : "#ddd" }}
          >
            {b}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-5">
        <p className="text-sm" style={{ color: "#888" }}>
          총 <span className="font-bold" style={{ color: "#111" }}>{data?.total ?? 0}</span>개 상품
        </p>
        <select
          value={sort}
          onChange={(e) => setParam("sort", e.target.value)}
          className="text-sm px-3 py-1.5 border rounded-sm outline-none"
          style={{ borderColor: "#ddd", color: "#333" }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {SKELETON_KEYS.map((k) => (
            <div key={k} className="animate-pulse">
              <div className="rounded-lg bg-gray-200 mb-2" style={{ aspectRatio: "3/4" }} />
              <div className="h-3 bg-gray-200 rounded w-16 mb-1" />
              <div className="h-4 bg-gray-200 rounded w-full mb-1" />
              <div className="h-4 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      ) : nonLoadingContent}
    </div>
  );
}
