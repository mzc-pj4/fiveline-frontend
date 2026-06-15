import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartView, Order, orderApi } from "../api";
import { clearSession, getUser } from "../auth";

export default function MyPage() {
  const navigate = useNavigate();
  const user = getUser();
  const [cart, setCart] = useState<CartView | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [cartRes, ordersRes] = await Promise.all([
          orderApi.get<CartView>("/api/cart"),
          orderApi.get<Order[]>("/api/orders/me"),
        ]);
        setCart(cartRes.data);
        setOrders(ordersRes.data);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const latestOrder = orders[0];
  const totalPaid = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total_price), 0),
    [orders],
  );

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  if (!user) {
    return <div className="empty-state surface">사용자 정보를 찾을 수 없습니다.</div>;
  }

  if (loading) {
    return <div className="loading-state surface">마이페이지를 불러오는 중입니다.</div>;
  }

  return (
    <div>
      <section className="mypage-hero surface">
        <div>
          <p className="eyebrow">My page</p>
          <h1 className="hero-title">{user.name}님의 market cloud</h1>
          <p className="hero-copy">장바구니, 주문 내역, 계정 정보를 한 번에 확인합니다.</p>
        </div>
        <div className="profile-card">
          <div className="profile-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{user.name}</strong>
            <p>{user.email}</p>
            <span className="status success">{user.role}</span>
          </div>
        </div>
      </section>

      <section className="mypage-grid">
        <article className="metric-card surface">
          <span className="metric-label">Cart items</span>
          <strong>{cart?.items.length ?? 0}</strong>
          <p>{Number(cart?.total_price ?? 0).toLocaleString()}원 대기 중</p>
          <Link to="/cart" className="btn btn-secondary">장바구니 보기</Link>
        </article>
        <article className="metric-card surface">
          <span className="metric-label">Orders</span>
          <strong>{orders.length}</strong>
          <p>누적 {totalPaid.toLocaleString()}원</p>
          <Link to="/orders" className="btn btn-secondary">주문 내역 보기</Link>
        </article>
        <article className="metric-card surface accent">
          <span className="metric-label">Fast checkout</span>
          <strong>1-click</strong>
          <p>장바구니 상품을 바로 결제 화면으로 이어갑니다.</p>
          <Link to={cart && cart.items.length > 0 ? "/checkout?cart=1" : "/products"} className="btn btn-primary">
            {cart && cart.items.length > 0 ? "결제하러 가기" : "상품 둘러보기"}
          </Link>
        </article>
      </section>

      <section className="mypage-content">
        <article className="surface mypage-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Recent order</p>
              <h2 className="section-title">최근 주문</h2>
            </div>
            <Link to="/orders" className="nav-action">전체 보기</Link>
          </div>
          {latestOrder ? (
            <div className="recent-order">
              <div>
                <strong>주문 #{latestOrder.id}</strong>
                <p className="small muted">{new Date(latestOrder.created_at).toLocaleString()}</p>
              </div>
              <span className={latestOrder.status === "SUCCESS" ? "status success" : "status fail"}>
                {latestOrder.status}
              </span>
              <strong>{Number(latestOrder.total_price).toLocaleString()}원</strong>
            </div>
          ) : (
            <div className="empty-inline">아직 주문 내역이 없습니다.</div>
          )}
        </article>

        <article className="surface mypage-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Account</p>
              <h2 className="section-title">계정 정보</h2>
            </div>
          </div>
          <dl className="account-list">
            <div>
              <dt>이름</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>이메일</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>권한</dt>
              <dd>{user.role}</dd>
            </div>
          </dl>
          <button onClick={handleLogout} className="btn btn-danger btn-full">
            로그아웃
          </button>
        </article>
      </section>
    </div>
  );
}
