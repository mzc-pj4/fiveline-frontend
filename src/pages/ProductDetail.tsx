import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Product, orderApi, productApi } from "../api";
import { isAuthenticated } from "../auth";

type Review = {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  content: string;
  created_at: string;
};

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");

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

  async function handleAddToCart() {
    if (!isAuthenticated() || !product) { setToast("로그인이 필요합니다"); return; }
    try {
      await orderApi.post("/api/cart/items", { product_id: product.id, quantity });
      setToast("장바구니에 담겼습니다");
    } catch (err: any) {
      setToast("실패: " + (err.response?.data?.detail ?? err.message));
    } finally {
      setTimeout(() => setToast(null), 2500);
    }
  }

  async function handleReview(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    try {
      await productApi.post(`/api/products/${id}/reviews`, { rating, content });
      setContent("");
      await load();
      setToast("리뷰가 작성되었습니다");
    } catch (err: any) {
      setToast("리뷰 작성 실패: " + (err.response?.data?.detail ?? err.message));
    } finally {
      setTimeout(() => setToast(null), 2500);
    }
  }

  if (loading) return <p className="text-gray-500">불러오는 중...</p>;
  if (!product) return <p>상품을 찾을 수 없습니다.</p>;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="p-3 bg-emerald-100 text-emerald-800 rounded">{toast}</div>
      )}

      <div className="bg-white rounded shadow p-6">
        <div className="flex items-start justify-between">
          <h2 className="text-2xl font-bold">{product.name}</h2>
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">{product.category}</span>
        </div>
        <p className="text-gray-600 mt-2">{product.description}</p>
        <p className="text-2xl mt-4">{Number(product.price).toLocaleString()}원</p>
        <p className="text-sm text-gray-500 mt-1">재고 {product.stock_quantity}개</p>

        <div className="flex items-center gap-2 mt-6">
          <label className="text-sm">수량</label>
          <input
            type="number" min={1} max={product.stock_quantity}
            value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}
            className="border rounded px-2 py-1 w-20"
          />
          <button
            onClick={handleAddToCart}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            장바구니에 담기
          </button>
        </div>
      </div>

      <div className="bg-white rounded shadow p-6">
        <h3 className="text-lg font-semibold mb-3">리뷰 ({reviews.length})</h3>
        {isAuthenticated() ? (
          <form onSubmit={handleReview} className="space-y-2 mb-4 pb-4 border-b">
            <div className="flex items-center gap-2">
              <label className="text-sm">별점</label>
              <select
                value={rating} onChange={(e) => setRating(Number(e.target.value))}
                className="border rounded px-2 py-1"
              >
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
              </select>
            </div>
            <textarea
              placeholder="리뷰 내용" value={content}
              onChange={(e) => setContent(e.target.value)} required
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
            <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm">
              리뷰 작성
            </button>
          </form>
        ) : (
          <p className="text-sm text-gray-500 mb-4">리뷰 작성은 로그인 후 가능합니다.</p>
        )}
        {reviews.length === 0 ? (
          <p className="text-gray-500 text-sm">아직 리뷰가 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="border-b last:border-0 pb-2">
                <div className="text-amber-600">{"★".repeat(r.rating)}</div>
                <p className="text-sm mt-1">{r.content}</p>
                <p className="text-xs text-gray-400 mt-1">user #{r.user_id} · {new Date(r.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
