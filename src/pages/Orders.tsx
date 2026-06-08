import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Order, orderApi } from "../api";

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi.get<Order[]>("/api/orders/me")
      .then((r) => setOrders(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-xl font-bold mb-6">내 주문 내역</h2>

      {orders.length === 0 ? (
        <div className="text-center py-24" style={{ color: "#bbb" }}>
          <p className="text-5xl mb-4">📦</p>
          <p className="text-base font-medium">주문 내역이 없습니다</p>
          <button
            onClick={() => navigate("/products")}
            className="mt-4 text-sm underline"
            style={{ color: "#666" }}
          >
            쇼핑 시작하기
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="bg-white border" style={{ borderColor: "#eee" }}>
              {/* 주문 헤더 */}
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: "1px solid #f0f0f0", background: "#fafafa" }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold" style={{ color: "#111" }}>
                    주문 #{o.id}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 font-medium rounded-sm"
                    style={{
                      background: o.status === "SUCCESS" ? "#ecfdf5" : "#fef2f2",
                      color: o.status === "SUCCESS" ? "#065f46" : "#991b1b",
                    }}
                  >
                    {o.status === "SUCCESS" ? "결제완료" : "결제실패"}
                  </span>
                  {o.error_code && (
                    <span className="text-xs" style={{ color: "#999" }}>
                      ({o.error_code})
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: "#111" }}>
                    {Number(o.total_price).toLocaleString()}원
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#aaa" }}>
                    {new Date(o.created_at).toLocaleString("ko-KR")}
                  </p>
                  {o.response_time_ms !== null && (
                    <p className="text-xs" style={{ color: "#ccc" }}>
                      응답 {o.response_time_ms}ms
                    </p>
                  )}
                </div>
              </div>

              {/* 주문 상품 목록 */}
              <ul>
                {o.items.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-center justify-between px-6 py-3 text-sm"
                    style={{ borderTop: "1px solid #f5f5f5" }}
                  >
                    <span style={{ color: "#333" }}>
                      {it.product_name ?? `상품 #${it.product_id}`}
                      <span className="ml-2 text-xs" style={{ color: "#aaa" }}>
                        × {it.quantity}
                      </span>
                    </span>
                    <span className="font-medium" style={{ color: "#111" }}>
                      {(Number(it.price) * it.quantity).toLocaleString()}원
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
