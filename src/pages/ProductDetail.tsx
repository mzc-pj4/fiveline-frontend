import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState<"detail" | "shipping" | "reviews">("detail");

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

  function changeQuantity(next: number) {
    if (!product) return;
    setQuantity(Math.min(product.stock_quantity, Math.max(1, next)));
  }

  async function handleAddToCart() {
    if (!isAuthenticated() || !product) { setToast("로그인이 필요합니다"); return; }
    setAdding(true);
    try {
      await orderApi.post("/api/cart/items", { product_id: product.id, quantity });
      setToast("장바구니에 담겼습니다");
    } catch (err: any) {
      setToast("실패: " + (err.response?.data?.detail ?? err.message));
    } finally {
      setAdding(false);
      setTimeout(() => setToast(null), 2500);
    }
  }

  function handleBuyNow() {
    if (!isAuthenticated() || !product) { setToast("로그인이 필요합니다"); return; }
    navigate(`/checkout?productId=${product.id}&quantity=${quantity}`);
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

  if (loading) return <div className="loading-state surface">상품 상세를 불러오는 중입니다.</div>;
  if (!product) return <div className="empty-state surface">상품을 찾을 수 없습니다.</div>;

  const reviewCount = product.review_count ?? reviews.length;
  const averageRating =
    product.average_rating ?? (reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0);
  const estimatedArrival = new Date();
  estimatedArrival.setDate(estimatedArrival.getDate() + 3);
  const estimatedArrivalLabel = estimatedArrival.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div>
      {toast && (
        <div className={toast.startsWith("실패") || toast.includes("필요") ? "toast error" : "toast"}>{toast}</div>
      )}

      <div className="detail-layout">
        <div className="detail-top-grid">
          <section className="detail-media surface">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="detail-image" />
          ) : (
            <div className={`product-media ${product.category} detail-image-fallback`}>
              <span>{product.category}</span>
            </div>
          )}
          </section>

          <section className="detail-purchase surface">
          <span className="badge">{product.category}</span>
          <h1 className="detail-title" style={{ marginTop: 14 }}>{product.name}</h1>
          <div className="detail-rating-row">
            <span className="stars">★ {averageRating > 0 ? averageRating.toFixed(1) : "0.0"}</span>
            <span className="small muted">리뷰 {reviewCount}</span>
          </div>
          <p className="page-copy">{product.description ?? "상품 설명이 준비 중입니다."}</p>
          <p className="price">{Number(product.price).toLocaleString()}원</p>
          <div className="detail-meta-block">
            <p className="small muted">배송 도착 예정일</p>
            <p className="detail-arrival">{estimatedArrivalLabel} 도착 예정</p>
          </div>

          <div className="purchase-panel">
            <div className="purchase-quantity">
              <label className="small muted">수량</label>
              <div className="stepper">
                <button className="stepper-btn" onClick={() => changeQuantity(quantity - 1)} aria-label="수량 줄이기">
                  -
                </button>
                <input
                  type="number" min={1} max={product.stock_quantity}
                  value={quantity} onChange={(e) => changeQuantity(Number(e.target.value))}
                  className="stepper-input"
                />
                <button className="stepper-btn" onClick={() => changeQuantity(quantity + 1)} aria-label="수량 늘리기">
                  +
                </button>
              </div>
            </div>
            <div className="purchase-total">
              <span className="small muted">예상 결제 금액</span>
              <strong>{(Number(product.price) * quantity).toLocaleString()}원</strong>
            </div>
          </div>
          <div className="purchase-actions">
            <button
              onClick={handleAddToCart}
              disabled={adding}
              className="btn btn-secondary"
            >
              {adding ? "담는 중..." : "장바구니"}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={adding}
              className="btn btn-primary"
            >
              바로 구매하기
            </button>
          </div>
          </section>
        </div>

        <section className="detail-tabs surface">
          <div className="tab-list">
          <button className={activeTab === "detail" ? "tab active" : "tab"} onClick={() => setActiveTab("detail")}>
            상품정보
          </button>
          <button className={activeTab === "shipping" ? "tab active" : "tab"} onClick={() => setActiveTab("shipping")}>
            배송안내
          </button>
          <button className={activeTab === "reviews" ? "tab active" : "tab"} onClick={() => setActiveTab("reviews")}>
            리뷰 {reviews.length}
          </button>
          </div>

          {activeTab === "detail" && (
            <div className="tab-panel">
              <p className="eyebrow">Product Detail</p>
              <h2 className="section-title">상품 정보</h2>
              <dl className="spec-list">
                <div><dt>카테고리</dt><dd>{product.category}</dd></div>
                <div><dt>상품명</dt><dd>{product.name}</dd></div>
                <div><dt>판매가</dt><dd>{Number(product.price).toLocaleString()}원</dd></div>
                <div><dt>판매상태</dt><dd>{product.stock_quantity > 0 ? "구매 가능" : "품절"}</dd></div>
              </dl>
            </div>
          )}

          {activeTab === "shipping" && (
            <div className="tab-panel">
              <p className="eyebrow">Delivery</p>
              <h2 className="section-title">배송 및 교환 안내</h2>
              <ul className="info-list">
                <li>기본 배송비는 데모 정책상 0원으로 처리됩니다.</li>
                <li>결제 완료 즉시 주문 상태가 생성됩니다.</li>
                <li>실제 배송, 결제 승인, 환불 처리는 연동되어 있지 않습니다.</li>
                <li>주문 결과와 응답 시간은 주문 내역에서 확인할 수 있습니다.</li>
              </ul>
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="tab-panel">
              <p className="eyebrow">Reviews</p>
              <h2 className="section-title">리뷰 {reviews.length}개</h2>
              {isAuthenticated() ? (
                <form onSubmit={handleReview} className="auth-form" style={{ marginBottom: 18 }}>
                  <div>
                    <label className="small muted">별점</label>
                    <select
                      value={rating} onChange={(e) => setRating(Number(e.target.value))}
                      className="select"
                      style={{ marginTop: 6 }}
                    >
                      {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
                    </select>
                  </div>
                  <textarea
                    placeholder="리뷰 내용" value={content}
                    onChange={(e) => setContent(e.target.value)} required
                    className="textarea"
                    rows={3}
                  />
                  <button className="btn btn-primary">리뷰 작성</button>
                </form>
              ) : (
                <p className="small muted">리뷰 작성은 로그인 후 가능합니다.</p>
              )}
              {reviews.length === 0 ? (
                <p className="small muted">아직 리뷰가 없습니다.</p>
              ) : (
                <ul className="review-list">
                  {reviews.map((r) => (
                    <li key={r.id} className="review-item">
                      <div className="stars">{"★".repeat(r.rating)}</div>
                      <p className="small">{r.content}</p>
                      <p className="small muted">user #{r.user_id} · {new Date(r.created_at).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
