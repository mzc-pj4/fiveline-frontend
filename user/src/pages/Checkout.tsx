import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CartView, Order, Product, orderApi, productApi } from "../api";

type OrderCheckoutMeta = {
  recipient: string;
  phone: string;
  address: string;
  memo: string;
  paymentMethod: string;
};

export default function Checkout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartView | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("홍길동");
  const [phone, setPhone] = useState("010-0000-0000");
  const [address, setAddress] = useState("서울특별시 강남구 테헤란로 000");
  const [memo, setMemo] = useState("문 앞에 놓아주세요");
  const [paymentMethod, setPaymentMethod] = useState("market-cloud-pay");

  const productId = params.get("productId");
  const quantity = Math.max(1, Number(params.get("quantity") ?? 1));
  const isCartCheckout = params.get("cart") === "1";

  const totalPrice = useMemo(() => {
    if (isCartCheckout) return Number(cart?.total_price ?? 0);
    return product ? Number(product.price) * quantity : 0;
  }, [cart, isCartCheckout, product, quantity]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (isCartCheckout) {
          const { data } = await orderApi.get<CartView>("/api/cart");
          setCart(data);
        } else if (productId) {
          const { data } = await productApi.get<Product>(`/api/products/${productId}`);
          setProduct(data);
        } else {
          setError("결제할 상품이 없습니다.");
        }
      } catch (err: any) {
        setError(err.response?.data?.detail ?? err.message ?? "결제 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isCartCheckout, productId]);

  async function handlePay() {
    if (totalPrice <= 0) {
      setError("결제할 상품이 없습니다.");
      return;
    }

    setPaying(true);
    setError(null);
    try {
      const { data } = isCartCheckout
        ? await orderApi.post<Order>("/api/orders/from-cart")
        : await orderApi.post<Order>("/api/orders/direct", {
            product_id: Number(productId),
            quantity,
          });

      if (data.status === "SUCCESS") {
        const checkoutMeta: OrderCheckoutMeta = {
          recipient,
          phone,
          address,
          memo,
          paymentMethod,
        };
        sessionStorage.setItem(`market-cloud:order-meta:${data.id}`, JSON.stringify(checkoutMeta));
        navigate(`/orders/${data.id}`, {
          state: {
            order: data,
            checkoutMeta,
          },
        });
      } else {
        setError(`주문 실패: ${data.error_code ?? "UNKNOWN"}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail ?? err.message ?? "결제 처리에 실패했습니다.");
    } finally {
      setPaying(false);
    }
  }

  if (loading) return <div className="loading-state surface">결제 정보를 불러오는 중입니다.</div>;

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="eyebrow">Checkout</p>
          <h1 className="page-title">결제하기</h1>
          <p className="page-copy">실제 PG 연동 없이 결제 버튼을 누르면 주문이 완료되는 데모 결제 화면입니다.</p>
        </div>
      </div>

      {error && <div className="toast error">{error}</div>}

      <div className="checkout-grid">
        <section className="surface checkout-section">
          <h2 className="section-title">주문 상품</h2>
          {isCartCheckout ? (
            cart && cart.items.length > 0 ? (
              <ul className="checkout-items">
                {cart.items.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.product_name ?? `상품 #${item.product_id}`}</strong>
                      <p className="small muted">수량 {item.quantity}</p>
                    </div>
                    <span>{Number(item.line_total ?? 0).toLocaleString()}원</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">장바구니가 비어 있습니다.</div>
            )
          ) : product ? (
            <div className="checkout-product">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="checkout-image" />
              ) : (
                <div className={`product-media ${product.category}`}>
                  <span>{product.category}</span>
                </div>
              )}
              <div>
                <strong>{product.name}</strong>
                <p className="small muted">수량 {quantity}</p>
                <p className="price">{(Number(product.price) * quantity).toLocaleString()}원</p>
              </div>
            </div>
          ) : (
            <div className="empty-state">결제할 상품이 없습니다.</div>
          )}
        </section>

        <aside className="surface checkout-summary">
          <h2 className="section-title">결제 요약</h2>
          <div className="checkout-form">
            <label>
              <span className="small muted">받는 사람</span>
              <input className="field" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            </label>
            <label>
              <span className="small muted">연락처</span>
              <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              <span className="small muted">배송지</span>
              <input className="field" value={address} onChange={(e) => setAddress(e.target.value)} />
            </label>
            <label>
              <span className="small muted">배송 메모</span>
              <select className="select" value={memo} onChange={(e) => setMemo(e.target.value)}>
                <option>문 앞에 놓아주세요</option>
                <option>직접 받고 부재 시 문 앞</option>
                <option>경비실에 맡겨주세요</option>
                <option>배송 전 연락주세요</option>
              </select>
            </label>
          </div>
          <div className="summary-line">
            <span>상품 금액</span>
            <strong>{totalPrice.toLocaleString()}원</strong>
          </div>
          <div className="summary-line">
            <span>배송비</span>
            <strong>0원</strong>
          </div>
          <div className="summary-total">
            <span>최종 결제 금액</span>
            <strong>{totalPrice.toLocaleString()}원</strong>
          </div>
          <div className="payment-box">
            <span className="badge">결제수단</span>
            <div className="payment-methods">
              <label className={paymentMethod === "market-cloud-pay" ? "payment-method active" : "payment-method"}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="market-cloud-pay"
                  checked={paymentMethod === "market-cloud-pay"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                market cloud pay
              </label>
              <label className={paymentMethod === "card" ? "payment-method active" : "payment-method"}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethod === "card"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                신용/체크카드
              </label>
            </div>
            <p className="small muted">데모 결제 수단입니다. 실제 결제는 발생하지 않습니다.</p>
          </div>
          <button className="btn btn-primary btn-full" onClick={handlePay} disabled={paying || totalPrice <= 0}>
            {paying ? "결제 처리 중..." : "결제하기"}
          </button>
        </aside>
      </div>
    </div>
  );
}
