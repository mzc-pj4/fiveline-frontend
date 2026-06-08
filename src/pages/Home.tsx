import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Product, productApi } from "../api";

export default function Home() {
  const navigate = useNavigate();
  const [bestItems, setBestItems] = useState<Product[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productApi.get("/api/products", { params: { sort: "newest", size: 8, page: 1 } }),
      productApi.get<string[]>("/api/products/brands", { params: { limit: 12 } }),
    ])
      .then(([productsRes, brandsRes]) => {
        setBestItems(productsRes.data.items ?? []);
        setBrands(brandsRes.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* 히어로 배너 */}
      <div
        className="relative flex flex-col items-center justify-center text-center py-24 px-4"
        style={{ background: "linear-gradient(135deg, #000 60%, #1a1a2e 100%)", minHeight: 340 }}
      >
        <p className="text-xs tracking-[0.4em] mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
          NEW SEASON 2026 S/S
        </p>
        <h1 className="font-black text-5xl tracking-[0.15em] mb-4" style={{ color: "#fff" }}>
          FIVELINE
        </h1>
        <p className="text-base mb-8" style={{ color: "rgba(255,255,255,0.6)" }}>
          패션의 기준을 다시 세우다
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/products")}
            className="font-bold px-8 py-3 text-sm tracking-widest transition-colors"
            style={{ background: "#fff", color: "#000" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e5e5")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            지금 쇼핑하기
          </button>
          <button
            onClick={() => navigate("/products?sort=price_asc")}
            className="font-bold px-8 py-3 text-sm tracking-widest border transition-colors"
            style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#fff")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)")}
          >
            세일 상품
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* 브랜드 */}
        <div className="mb-14">
          <h2 className="font-black text-xl mb-5">인기 브랜드</h2>
          <div className="flex flex-wrap gap-2">
            {brands.map((brand) => (
              <button
                key={brand}
                onClick={() => navigate(`/products?brand=${encodeURIComponent(brand)}`)}
                className="px-4 py-2 text-xs font-bold tracking-wider border transition-colors hover:bg-black hover:text-white hover:border-black"
                style={{ background: "#fff", borderColor: "#ddd", color: "#333" }}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>

        {/* 베스트 아이템 */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-black text-xl">BEST 아이템</h2>
            <Link to="/products" className="text-xs font-medium tracking-wider underline" style={{ color: "#666" }}>
              전체 보기
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] bg-gray-100 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-16 mb-1" />
                  <div className="h-4 bg-gray-100 rounded w-full mb-1" />
                  <div className="h-4 bg-gray-100 rounded w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {bestItems.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductCard({ product: p }: { product: Product }) {
  const discount = p.original_price
    ? Math.round((1 - Number(p.price) / Number(p.original_price)) * 100)
    : 0;

  return (
    <Link to={`/products/${p.id}`} className="group block">
      {/* 이미지 영역 */}
      <div
        className="mb-2 overflow-hidden bg-gray-100"
        style={{ aspectRatio: "3/4" }}
      >
        <img
          src={p.image_url ?? ""}
          alt={p.name}
          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            const t = e.currentTarget as HTMLImageElement;
            t.onerror = null;
            t.style.display = "none";
            const parent = t.parentElement;
            if (parent && !parent.querySelector(".img-fallback")) {
              const fb = document.createElement("div");
              fb.className = "img-fallback";
              fb.style.cssText = "width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f3f4f6;";
              fb.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/></svg><span style="font-size:11px;color:#bbb;margin-top:8px;text-align:center;padding:0 8px;">${(p.brand ?? "").slice(0, 15)}</span>`;
              parent.appendChild(fb);
            }
          }}
        />
      </div>
      {/* 정보 */}
      <p className="text-xs font-medium mb-0.5 tracking-wider" style={{ color: "#999" }}>{p.brand}</p>
      <p className="text-sm leading-snug line-clamp-2 group-hover:underline" style={{ color: "#111" }}>
        {p.name}
      </p>
      <div className="flex items-center gap-1.5 mt-1">
        {discount > 0 && (
          <span className="text-sm font-bold" style={{ color: "#ef4444" }}>{discount}%</span>
        )}
        <span className="text-sm font-bold" style={{ color: "#111" }}>
          {Number(p.price).toLocaleString()}원
        </span>
      </div>
      {p.original_price && discount > 0 && (
        <p className="text-xs line-through" style={{ color: "#bbb" }}>
          {Number(p.original_price).toLocaleString()}원
        </p>
      )}
    </Link>
  );
}
