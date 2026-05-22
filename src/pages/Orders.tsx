import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

  if (loading) return <div className="loading-state surface">주문 내역을 불러오는 중입니다.</div>;
  if (orders.length === 0) {
    return (
      <div>
        <div className="page-head">
          <div>
            <p className="eyebrow">Orders</p>
            <h1 className="page-title">내 주문 내역</h1>
          </div>
        </div>
        <div className="empty-state surface">주문 내역이 없습니다.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="eyebrow">Orders</p>
          <h1 className="page-title">내 주문 내역</h1>
          <p className="page-copy">주문 생성 결과와 응답 시간을 확인합니다.</p>
        </div>
        <span className="badge">{orders.length} orders</span>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
      {orders.map((o) => (
        <article key={o.id} className="order-card surface">
          <div className="order-head">
            <div>
              <strong>
                <Link to={`/orders/${o.id}`} className="order-link">
                  주문 #{o.id}
                </Link>
              </strong>
              <span
                className={o.status === "SUCCESS" ? "status success" : "status fail"}
                style={{ marginLeft: 10 }}
              >
                {o.status}
              </span>
              {o.error_code && (
                <span className="small" style={{ color: "#EF4444", marginLeft: 8 }}>({o.error_code})</span>
              )}
            </div>
            <div className="text-right">
              <strong>{Number(o.total_price).toLocaleString()}원</strong>
              <p className="small muted">
                {new Date(o.created_at).toLocaleString()}
              </p>
              {o.response_time_ms !== null && (
                <p className="small muted">응답 {o.response_time_ms}ms</p>
              )}
              <p className="small">
                <Link to={`/orders/${o.id}`} className="order-link">
                  상세 보기
                </Link>
              </p>
            </div>
          </div>
          <ul className="order-items">
            {o.items.map((it) => (
              <li key={it.id}>
                <span>상품 #{it.product_id} × {it.quantity}</span>
                <span>{Number(it.price).toLocaleString()}원</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
      </div>
    </div>
  );
}
