import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartItem, CartView, Order, orderApi } from "../api";

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartView | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [result, setResult] = useState<Order | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const { data } = await orderApi.get<CartView>("/api/cart");
      setCart(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function calcTotal(items: CartItem[]): number {
    return items.reduce((s, it) => s + Number(it.line_total ?? 0), 0);
  }

  async function updateQty(cartItemId: number, quantity: number) {
    if (quantity < 1) return;
    if (!cart) return;

    // 즉시 로컬 state 업데이트
    const updated = cart.items.map((it) => {
      if (it.id !== cartItemId) return it;
      const price = Number(it.product_price ?? 0);
      return { ...it, quantity, line_total: price * quantity };
    });
    setCart({ items: updated, total_price: calcTotal(updated) });

    // 백그라운드 서버 동기화
    setPendingIds((s) => new Set(s).add(cartItemId));
    try {
      await orderApi.patch(`/api/cart/items/${cartItemId}`, { quantity });
    } catch {
      load(); // 실패 시 서버 상태로 복원
    } finally {
      setPendingIds((s) => { const n = new Set(s); n.delete(cartItemId); return n; });
    }
  }

  async function remove(cartItemId: number) {
    if (!cart) return;

    // 즉시 로컬 state에서 제거
    const updated = cart.items.filter((it) => it.id !== cartItemId);
    setCart({ items: updated, total_price: calcTotal(updated) });

    try {
      await orderApi.delete(`/api/cart/items/${cartItemId}`);
    } catch {
      load(); // 실패 시 복원
    }
  }

  async function checkout() {
    setOrdering(true);
    setResult(null);
    let placed: Order | null = null;
    try {
      const { data } = await orderApi.post<Order>("/api/orders/from-cart");
      placed = data;
      setResult(data);
    } catch (err: any) {
      alert("주문 실패: " + (err.response?.data?.detail ?? err.message));
      setOrdering(false);
      return;
    }
    // 주문 완료 후 장바구니 재로드 — 실패해도 주문은 이미 처리됨
    try {
      await load();
    } catch {
      if (placed?.status === "SUCCESS") setCart({ items: [], total_price: 0 });
    } finally {
      setOrdering(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-16 bg-gray-200 rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-xl font-bold mb-6">장바구니</h2>

      {result && (
        <div className={`mb-6 p-4 rounded text-sm font-medium ${
          result.status === "SUCCESS" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {result.status === "SUCCESS"
            ? `주문 완료 #${result.id} · ${Number(result.total_price).toLocaleString()}원`
            : `주문 실패 #${result.id} · ${result.error_code}`}
          <button onClick={() => navigate("/orders")} className="ml-3 underline">
            주문 내역 보기
          </button>
        </div>
      )}

      {!cart || cart.items.length === 0 ? (
        <div className="text-center py-24" style={{ color: "#bbb" }}>
          <p className="text-5xl mb-4">🛒</p>
          <p className="text-base font-medium">장바구니가 비어 있습니다</p>
          <button onClick={() => navigate("/products")} className="mt-4 text-sm underline" style={{ color: "#666" }}>
            쇼핑 계속하기
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white border" style={{ borderColor: "#eee" }}>
            <table className="w-full">
              <thead style={{ borderBottom: "1px solid #eee" }}>
                <tr className="text-xs font-medium" style={{ color: "#888" }}>
                  <th className="text-left px-6 py-3">상품</th>
                  <th className="text-right px-6 py-3">단가</th>
                  <th className="text-center px-6 py-3">수량</th>
                  <th className="text-right px-6 py-3">합계</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {cart.items.map((it) => (
                  <tr key={it.id} style={{ borderTop: "1px solid #f0f0f0" }}>
                    <td className="px-6 py-4 text-sm font-medium">
                      {it.product_name ?? `상품 #${it.product_id}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-right" style={{ color: "#555" }}>
                      {it.product_price ? Number(it.product_price).toLocaleString() + "원" : "-"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center border" style={{ borderColor: "#ddd" }}>
                        <button
                          onClick={() => updateQty(it.id, it.quantity - 1)}
                          disabled={pendingIds.has(it.id)}
                          className="w-8 h-8 text-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-medium">{it.quantity}</span>
                        <button
                          onClick={() => updateQty(it.id, it.quantity + 1)}
                          disabled={pendingIds.has(it.id)}
                          className="w-8 h-8 text-lg flex items-center justify-center hover:bg-gray-50 disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right">
                      {it.line_total ? Number(it.line_total).toLocaleString() + "원" : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => remove(it.id)}
                        className="text-xs hover:underline"
                        style={{ color: "#e33" }}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-6 pt-6" style={{ borderTop: "1px solid #ddd" }}>
            <div>
              <span className="text-sm" style={{ color: "#888" }}>총 결제금액</span>
              <p className="text-2xl font-bold mt-0.5">{Number(cart.total_price).toLocaleString()}원</p>
            </div>
            <button
              onClick={checkout}
              disabled={ordering}
              className="px-10 py-4 text-white text-sm font-bold tracking-widest disabled:opacity-50 transition-colors"
              style={{ background: ordering ? "#555" : "#000" }}
            >
              {ordering ? "주문 중..." : "주문하기"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
