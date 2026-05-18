import { useEffect, useState } from "react";
import { Order, orderApi } from "../api";

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi
      .get<Order[]>("/api/orders/me")
      .then((r) => setOrders(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">불러오는 중...</p>;
  if (orders.length === 0) return <p className="text-gray-500">주문 내역이 없습니다.</p>;

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-bold">내 주문 내역</h2>
      {orders.map((o) => (
        <div key={o.id} className="bg-white rounded shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold">주문 #{o.id}</span>
              <span
                className={`ml-3 text-xs px-2 py-1 rounded ${
                  o.status === "SUCCESS"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {o.status}
              </span>
              {o.error_code && (
                <span className="ml-2 text-xs text-red-600">({o.error_code})</span>
              )}
            </div>
            <div className="text-right">
              <p className="font-semibold">{Number(o.total_price).toLocaleString()}원</p>
              <p className="text-xs text-gray-500">
                {new Date(o.created_at).toLocaleString()}
              </p>
              {o.response_time_ms !== null && (
                <p className="text-xs text-gray-400">응답 {o.response_time_ms}ms</p>
              )}
            </div>
          </div>
          <ul className="mt-3 text-sm text-gray-700">
            {o.items.map((it) => (
              <li key={it.id} className="border-t pt-2 mt-2 flex justify-between">
                <span>상품 #{it.product_id} × {it.quantity}</span>
                <span>{Number(it.price).toLocaleString()}원</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
