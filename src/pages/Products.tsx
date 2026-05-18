import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Product, ProductList, orderApi, productApi } from "../api";
import { isAuthenticated } from "../auth";

export default function Products() {
  const [items, setItems] = useState<Product[]>([]);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (keyword) params.keyword = keyword;
      if (category) params.category = category;
      const { data } = await productApi.get<ProductList>("/api/products", { params });
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    await load();
  }

  async function handleAddToCart(productId: number) {
    if (!isAuthenticated()) {
      setToast("로그인 후 사용 가능합니다");
      return;
    }
    setAdding(productId);
    try {
      await orderApi.post("/api/cart/items", { product_id: productId, quantity: 1 });
      setToast("장바구니에 담겼습니다");
    } catch (err: any) {
      setToast("장바구니 담기 실패: " + (err.response?.data?.detail ?? err.message));
    } finally {
      setAdding(null);
      setTimeout(() => setToast(null), 2500);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">상품 목록</h2>
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text" placeholder="검색어"
          value={keyword} onChange={(e) => setKeyword(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
        />
        <select
          value={category} onChange={(e) => setCategory(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">전체 카테고리</option>
          <option value="electronics">electronics</option>
          <option value="fashion">fashion</option>
          <option value="kitchen">kitchen</option>
          <option value="home">home</option>
        </select>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
          검색
        </button>
      </form>

      {toast && (
        <div className="mb-4 p-3 bg-emerald-100 text-emerald-800 rounded">{toast}</div>
      )}

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">상품이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <div key={p.id} className="bg-white rounded shadow p-4 flex flex-col">
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <Link to={`/products/${p.id}`} className="font-semibold hover:underline">
                    {p.name}
                  </Link>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">{p.category}</span>
                </div>
                <p className="text-xl mt-2">{Number(p.price).toLocaleString()}원</p>
                <p className="text-xs text-gray-500 mt-1">재고 {p.stock_quantity}</p>
                {p.review_count !== undefined && p.review_count > 0 && (
                  <p className="text-xs text-amber-700 mt-1">
                    ★ {p.average_rating?.toFixed(1)} ({p.review_count})
                  </p>
                )}
              </div>
              <button
                onClick={() => handleAddToCart(p.id)}
                disabled={adding === p.id}
                className="mt-3 bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50 text-sm"
              >
                {adding === p.id ? "담는 중..." : "장바구니"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
