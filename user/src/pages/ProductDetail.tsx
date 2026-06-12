import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Product, orderApi, productApi } from "../api";
import { isAuthenticated } from "../auth";

type Review = {
  id: number;
  product_id: number;
  user_id: number;
  reviewer_name: string | null;
  rating: number;
  content: string;
  created_at: string;
};

function maskName(name: string | null | undefined): string {
  if (!name || name.length < 2) return "익명";
  if (name.length === 2) return name[0] + "*";
  return name[0] + "*".repeat(name.length - 2) + (name.at(-1) ?? "");
}


export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const [pRes, rRes] = await Promise.all([
        productApi.get<Product>(`/api/products/${id}`),
        productApi.get<Review[]>(`/api/products/${id}/reviews`),
      ]);
      setProduct(pRes.data);
      setReviews(rRes.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleAddToCart() {
    if (!isAuthenticated() || !product) { showToast("로그인이 필요합니다"); return; }
    // 즉시 토스트 표시 (optimistic) — 서버 응답 기다리지 않음
    showToast("장바구니에 담겼습니다 🛒");
    setAdding(true);
    try {
      await orderApi.post("/api/cart/items", { product_id: product.id, quantity });
    } catch (err: any) {
      showToast("추가 실패: " + (err.response?.data?.detail ?? err.message));
    } finally {
      setAdding(false);
    }
  }

  async function handleReview(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    try {
      await productApi.post(`/api/products/${id}/reviews`, { rating, content });
      setContent("");
      await load();
      showToast("리뷰가 작성되었습니다");
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        showToast("구매한 상품에만 리뷰를 작성할 수 있습니다");
      } else if (status === 409) {
        showToast("이미 해당 상품에 리뷰를 작성하셨습니다");
      } else {
        showToast(err.response?.data?.detail ?? err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="rounded-xl bg-gray-200" style={{ aspectRatio: "3/4" }} />
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-6 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return (
    <div className="max-w-5xl mx-auto px-4 py-16 text-center">
      <p className="text-4xl mb-4">😕</p>
      <p className="text-gray-600">상품을 찾을 수 없습니다.</p>
      <Link to="/products" className="mt-4 inline-block text-sm underline" style={{ color: "#666" }}>상품 목록으로</Link>
    </div>
  );

  const discount = product.original_price
    ? Math.round((1 - Number(product.price) / Number(product.original_price)) * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 토스트 */}
      {toast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-sm font-medium z-50 shadow-lg whitespace-nowrap"
          style={{ background: "#111", color: "#fff" }}
        >
          {toast}
        </div>
      )}

      {/* 뒤로가기 */}
      <Link to="/products" className="inline-flex items-center gap-1 text-sm mb-6" style={{ color: "#888" }}>
        ← 목록으로
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* 이미지 */}
        <div
          className="overflow-hidden flex items-center justify-center"
          style={{ background: "#f5f5f5", aspectRatio: "3/4" }}
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "#f3f4f6" }}>
              <span className="text-6xl" style={{ color: "#ddd" }}>—</span>
            </div>
          )}
        </div>

        {/* 상품 정보 */}
        <div className="flex flex-col">
          <div className="mb-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-bold" style={{ color: "#333" }}>{product.brand}</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#f3f4f6", color: "#666" }}>{product.category}</span>
            </div>
            <h1 className="text-2xl font-black mb-4 leading-snug" style={{ color: "#111" }}>{product.name}</h1>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "#666" }}>{product.description}</p>

            {/* 가격 */}
            <div className="mb-6">
              {product.original_price && discount > 0 && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-black" style={{ color: "#ef4444" }}>{discount}% 할인</span>
                  <span className="text-sm line-through" style={{ color: "#bbb" }}>
                    {Number(product.original_price).toLocaleString()}원
                  </span>
                </div>
              )}
              <p className="text-3xl font-black" style={{ color: "#111" }}>
                {Number(product.price).toLocaleString()}원
              </p>
            </div>

            {/* 리뷰 요약 */}
            {reviews.length > 0 && (
              <p className="text-sm mb-6" style={{ color: "#f59e0b" }}>
                {"★".repeat(Math.round(product.average_rating ?? 0))}
                {"☆".repeat(5 - Math.round(product.average_rating ?? 0))}
                <span className="ml-1" style={{ color: "#888" }}>({reviews.length}개 리뷰)</span>
              </p>
            )}

          </div>

          {/* 수량 + 장바구니 */}
          <div className="border-t pt-6" style={{ borderColor: "#f3f4f6" }}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-medium" style={{ color: "#555" }}>수량</span>
              <div className="flex items-center border rounded" style={{ borderColor: "#ddd" }}>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-1.5 text-sm hover:bg-gray-50"
                  style={{ color: "#333" }}
                >−</button>
                <span className="px-4 py-1.5 text-sm font-medium border-x" style={{ borderColor: "#ddd" }}>{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-1.5 text-sm hover:bg-gray-50"
                  style={{ color: "#333" }}
                >+</button>
              </div>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={adding}
              className="w-full py-4 font-bold text-base rounded-sm transition-colors disabled:opacity-40"
              style={{ background: "#000", color: "#fff" }}
              onMouseEnter={(e) => { if (!adding) e.currentTarget.style.background = "#222"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#000"; }}
            >
              {adding ? "담는 중..." : "장바구니 담기"}
            </button>
          </div>
        </div>
      </div>

      {/* 리뷰 섹션 */}
      <div className="border-t pt-8" style={{ borderColor: "#ececec" }}>
        <h2 className="text-lg font-black mb-6" style={{ color: "#111" }}>
          리뷰 <span style={{ color: "#bbb", fontWeight: 400 }}>({reviews.length})</span>
        </h2>

        {isAuthenticated() ? (
          <form onSubmit={handleReview} className="mb-8 p-4 rounded-xl" style={{ background: "#fafafa", border: "1px solid #f0f0f0" }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-medium" style={{ color: "#555" }}>별점</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} className="text-xl">
                    <span style={{ color: n <= rating ? "#f59e0b" : "#ddd" }}>★</span>
                  </button>
                ))}
              </div>
            </div>
            <textarea
              placeholder="구매하신 상품 후기를 남겨주세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={3}
              className="w-full rounded-lg px-4 py-3 text-sm outline-none resize-none"
              style={{ border: "1px solid #e5e7eb", color: "#333" }}
            />
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 px-6 py-2 text-sm font-bold rounded-sm transition-colors disabled:opacity-50"
              style={{ background: "#000", color: "#fff" }}
            >
              {submitting ? "작성 중..." : "리뷰 작성"}
            </button>
          </form>
        ) : (
          <p className="text-sm mb-6 p-4 rounded-lg" style={{ background: "#fafafa", color: "#888" }}>
            리뷰 작성은 <Link to="/login" className="underline" style={{ color: "#000" }}>로그인</Link> 후 가능합니다.
          </p>
        )}

        {reviews.length === 0 ? (
          <p className="text-sm" style={{ color: "#bbb" }}>아직 리뷰가 없습니다. 첫 번째 리뷰를 남겨보세요!</p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="pb-4 border-b" style={{ borderColor: "#f3f4f6" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{ color: "#f59e0b" }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  <span className="text-xs" style={{ color: "#bbb" }}>
                    {maskName(r.reviewer_name)} · {new Date(r.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "#444" }}>{r.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
