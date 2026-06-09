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
    window.dispatchEvent(new Event("market-cloud:cart-changed"));
    await load();
  }

  async function remove(cartItemId: number) {
    await orderApi.delete(`/api/cart/items/${cartItemId}`);
    window.dispatchEvent(new Event("market-cloud:cart-changed"));
    await load();
  }

  async function checkout() {
    setOrdering(true);
    navigate("/checkout?cart=1");
  }

  if (loading) return <div className="loading-state surface">장바구니를 불러오는 중입니다.</div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="eyebrow">Checkout</p>
          <h1 className="page-title">장바구니</h1>
          <p className="page-copy">주문 생성과 서비스 간 통신을 확인하는 테스트 플로우입니다.</p>
        </div>
      </div>

      {result && (
        <div
          className={result.status === "SUCCESS" ? "toast" : "toast error"}
        >
          {result.status === "SUCCESS"
            ? `주문 성공 #${result.id} · ${Number(result.total_price).toLocaleString()}원 · 응답 ${result.response_time_ms}ms`
            : `주문 실패 #${result.id} · 사유: ${result.error_code}`}
          <button
            onClick={() => navigate("/orders")}
            className="nav-action"
            style={{ marginLeft: 10 }}
          >
            주문 내역 보기
          </button>
        </div>
      )}

      {!cart || cart.items.length === 0 ? (
        <div className="empty-state surface">장바구니가 비어 있습니다.</div>
      ) : (
        <>
          <div className="table-wrap surface">
            <table className="data-table">
              <thead>
                <tr>
                  <th>상품</th>
                  <th className="text-right">단가</th>
                  <th className="text-center">수량</th>
                  <th className="text-right">합계</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      {it.product_name ?? `상품 #${it.product_id}`}
                    </td>
                    <td className="text-right">
                      {it.product_price ? Number(it.product_price).toLocaleString() + "원" : "-"}
                    </td>
                    <td className="text-center">
                      <div className="mini-stepper">
                        <button onClick={() => updateQty(it.id, it.quantity - 1)} aria-label="수량 줄이기">-</button>
                        <span>{it.quantity}</span>
                        <button onClick={() => updateQty(it.id, it.quantity + 1)} aria-label="수량 늘리기">+</button>
                      </div>
                    </td>
                    <td className="text-right">
                      {it.line_total ? Number(it.line_total).toLocaleString() + "원" : "-"}
                    </td>
                    <td className="text-right">
                      <button onClick={() => remove(it.id)} className="btn btn-danger" style={{ minHeight: 32 }}>
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="summary-bar surface">
            <span style={{ fontSize: 20, fontWeight: 850 }}>
              총 {Number(cart.total_price).toLocaleString()}원
            </span>
            <button
              onClick={checkout} disabled={ordering}
              className="btn btn-primary"
            >
              {ordering ? "주문 중..." : "주문하기"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
