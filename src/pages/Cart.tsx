import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartView, Order, orderApi } from "../api";

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartView | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [result, setResult] = useState<Order | null>(null);

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

  async function updateQty(cartItemId: number, quantity: number) {
    if (quantity < 1) return;
    await orderApi.patch(`/api/cart/items/${cartItemId}`, { quantity });
    await load();
  }

  async function remove(cartItemId: number) {
    await orderApi.delete(`/api/cart/items/${cartItemId}`);
    await load();
  }

  async function checkout() {
    setOrdering(true);
    setResult(null);
    try {
      const { data } = await orderApi.post<Order>("/api/orders/from-cart");
      setResult(data);
      await load();
    } catch (err: any) {
      setResult(null);
      alert("주문 실패: " + (err.response?.data?.detail ?? err.message));
    } finally {
      setOrdering(false);
    }
  }

  if (loading) return <p className="text-gray-500">불러오는 중...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">장바구니</h2>

      {result && (
        <div
          className={`p-4 rounded ${
            result.status === "SUCCESS" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
          }`}
        >
          {result.status === "SUCCESS"
            ? `주문 성공 #${result.id} · ${Number(result.total_price).toLocaleString()}원 · 응답 ${result.response_time_ms}ms`
            : `주문 실패 #${result.id} · 사유: ${result.error_code}`}
          <button
            onClick={() => navigate("/orders")}
            className="ml-3 text-sm underline"
          >
            주문 내역 보기
          </button>
        </div>
      )}

      {!cart || cart.items.length === 0 ? (
        <p className="text-gray-500">장바구니가 비어 있습니다.</p>
      ) : (
        <>
          <div className="bg-white rounded shadow">
            <table className="w-full">
              <thead className="bg-gray-50 text-sm">
                <tr>
                  <th className="text-left px-4 py-2">상품</th>
                  <th className="text-right px-4 py-2">단가</th>
                  <th className="text-center px-4 py-2">수량</th>
                  <th className="text-right px-4 py-2">합계</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {cart.items.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="px-4 py-3">
                      {it.product_name ?? `상품 #${it.product_id}`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {it.product_price ? Number(it.product_price).toLocaleString() + "원" : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => updateQty(it.id, it.quantity - 1)} className="px-2">-</button>
                      <span className="px-2">{it.quantity}</span>
                      <button onClick={() => updateQty(it.id, it.quantity + 1)} className="px-2">+</button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {it.line_total ? Number(it.line_total).toLocaleString() + "원" : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(it.id)} className="text-red-600 text-sm hover:underline">
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between bg-white rounded shadow p-4">
            <span className="text-lg">
              총 {Number(cart.total_price).toLocaleString()}원
            </span>
            <button
              onClick={checkout} disabled={ordering}
              className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {ordering ? "주문 중..." : "주문하기"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
