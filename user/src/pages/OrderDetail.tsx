import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Order, Product, orderApi, productApi } from "../api";

type OrderCheckoutMeta = {
  recipient: string;
  phone: string;
  address: string;
  memo: string;
  paymentMethod: string;
};

type OrderDetailState = {
  checkoutMeta?: OrderCheckoutMeta;
  order?: Order;
};

type EnrichedOrderItem = Order["items"][number] & {
  product?: Product | null;
};

export default function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const state = (location.state as OrderDetailState | null) ?? null;
  const [order, setOrder] = useState<Order | null>(state?.order ?? null);
  const [items, setItems] = useState<EnrichedOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutMeta, setCheckoutMeta] = useState<OrderCheckoutMeta | null>(() => {
    if (state?.checkoutMeta) return state.checkoutMeta;
    if (!id) return null;
    const saved = sessionStorage.getItem(`market-cloud:order-meta:${id}`);
    return saved ? (JSON.parse(saved) as OrderCheckoutMeta) : null;
  });

  useEffect(() => {
    async function load() {
      if (!id) {
        setError("주문 정보를 찾을 수 없습니다.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const currentOrder = state?.order?.id === Number(id)
          ? state.order
          : (await orderApi.get<Order[]>("/api/orders/me")).data.find((entry) => entry.id === Number(id)) ?? null;

        if (!currentOrder) {
          setError("해당 주문을 찾지 못했습니다.");
          setOrder(null);
          setItems([]);
          return;
        }

        setOrder(currentOrder);

        const uniqueProductIds = [...new Set(currentOrder.items.map((item) => item.product_id))];
        const productEntries = await Promise.all(
          uniqueProductIds.map(async (productId) => {
            try {
              const { data } = await productApi.get<Product>(`/api/products/${productId}`);
              return [productId, data] as const;
            } catch {
              return [productId, null] as const;
            }
          }),
        );

        const productMap = new Map<number, Product | null>(productEntries);
        setItems(
          currentOrder.items.map((item) => ({
            ...item,
            product: productMap.get(item.product_id) ?? null,
          })),
        );

        if (!checkoutMeta) {
          const saved = sessionStorage.getItem(`market-cloud:order-meta:${id}`);
          if (saved) {
            setCheckoutMeta(JSON.parse(saved) as OrderCheckoutMeta);
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.detail ?? err.message ?? "주문 상세를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [checkoutMeta, id, state]);

  if (loading) return <div className="loading-state surface">주문 상세를 불러오는 중입니다.</div>;

  if (error || !order) {
    return (
      <div>
        <div className="page-head">
          <div>
            <p className="eyebrow">Order detail</p>
            <h1 className="page-title">주문 상세</h1>
          </div>
        </div>
        <div className="toast error">{error ?? "주문 정보를 찾을 수 없습니다."}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="eyebrow">Order detail</p>
          <h1 className="page-title">주문 #{order.id}</h1>
          <p className="page-copy">결제 직후 주문 정보와 상품 상세를 확인할 수 있는 화면입니다.</p>
        </div>
        <Link to="/orders" className="btn btn-secondary">전체 주문 내역</Link>
      </div>

      <div className="order-detail-grid">
        <section className="surface order-detail-main">
          <div className="order-detail-summary">
            <div>
              <span className={order.status === "SUCCESS" ? "status success" : "status fail"}>
                {order.status}
              </span>
              <strong>{Number(order.total_price).toLocaleString()}원</strong>
            </div>
            <div className="text-right">
              <p className="small muted">{new Date(order.created_at).toLocaleString()}</p>
              {order.response_time_ms !== null && (
                <p className="small muted">응답 시간 {order.response_time_ms}ms</p>
              )}
            </div>
          </div>

          <h2 className="section-title">구매 상품</h2>
          <ul className="order-detail-items">
            {items.map((item) => (
              <li key={item.id}>
                {item.product?.image_url ? (
                  <img src={item.product.image_url} alt={item.product.name} className="order-detail-image" />
                ) : (
                  <div className={`product-media ${item.product?.category ?? "electronics"} order-detail-fallback`}>
                    <span>{item.product?.category ?? "item"}</span>
                  </div>
                )}
                <div className="order-detail-copy">
                  <strong>{item.product?.name ?? `상품 #${item.product_id}`}</strong>
                  <p className="small muted">수량 {item.quantity}</p>
                  <p className="small muted">상품 ID {item.product_id}</p>
                </div>
                <strong>{Number(item.price).toLocaleString()}원</strong>
              </li>
            ))}
          </ul>
        </section>

        <aside className="surface order-detail-side">
          <h2 className="section-title">배송 및 결제 정보</h2>
          {checkoutMeta ? (
            <dl className="account-list">
              <div>
                <dt>받는 사람</dt>
                <dd>{checkoutMeta.recipient}</dd>
              </div>
              <div>
                <dt>연락처</dt>
                <dd>{checkoutMeta.phone}</dd>
              </div>
              <div>
                <dt>배송지</dt>
                <dd>{checkoutMeta.address}</dd>
              </div>
              <div>
                <dt>배송 메모</dt>
                <dd>{checkoutMeta.memo}</dd>
              </div>
              <div>
                <dt>결제 수단</dt>
                <dd>{checkoutMeta.paymentMethod}</dd>
              </div>
            </dl>
          ) : (
            <div className="empty-inline">이 주문의 배송 및 결제 입력 정보는 현재 세션에 저장된 경우에만 표시됩니다.</div>
          )}

          <div className="payment-box">
            <span className="badge">주문 요약</span>
            <div className="summary-line">
              <span>상품 수</span>
              <strong>{items.length}개</strong>
            </div>
            <div className="summary-line">
              <span>배송비</span>
              <strong>0원</strong>
            </div>
            <div className="summary-total">
              <span>총 결제 금액</span>
              <strong>{Number(order.total_price).toLocaleString()}원</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
