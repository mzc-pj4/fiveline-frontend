import { FormEvent, useEffect, useState } from "react";
import { LogOut, Menu, Search, ShoppingCart, User } from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { CartView, orderApi } from "../api";
import { clearSession, getUser, isAuthenticated } from "../auth";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const authed = isAuthenticated();
  const [searchTerm, setSearchTerm] = useState("");
  const [cartCount, setCartCount] = useState(0);

  const categories = [
    { value: "", label: "전체" },
    { value: "best", label: "베스트" },
    { value: "sale", label: "세일" },
    { value: "new", label: "신상" },
  ];

  const currentCollection = new URLSearchParams(location.search).get("collection") ?? "";

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  function handleCategoryOpen() {
    if (location.pathname.startsWith("/products")) {
      window.dispatchEvent(new Event("market-cloud:toggle-category-menu"));
      return;
    }
    sessionStorage.setItem("market-cloud:open-category-menu", "1");
    navigate("/products");
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    const nextKeyword = searchTerm.trim();
    if (nextKeyword) params.set("keyword", nextKeyword);
    navigate(`/products${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function handleCategorySelect(category: string) {
    const params = new URLSearchParams();
    if (category) params.set("collection", category);
    navigate(`/products${params.toString() ? `?${params.toString()}` : ""}`);
  }

  useEffect(() => {
    async function loadCartCount() {
      if (!authed) {
        setCartCount(0);
        return;
      }
      try {
        const { data } = await orderApi.get<CartView>("/api/cart");
        setCartCount(data.items.reduce((sum, item) => sum + item.quantity, 0));
      } catch {
        setCartCount(0);
      }
    }

    function refreshCartCount() {
      void loadCartCount();
    }

    void loadCartCount();
    window.addEventListener("market-cloud:cart-changed", refreshCartCount);
    return () => window.removeEventListener("market-cloud:cart-changed", refreshCartCount);
  }, [authed, location.pathname]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="utilitybar">
          <div className="utilitybar-inner">
            {!authed && (
              <>
                <Link to="/login">로그인</Link>
                <Link to="/signup">회원가입</Link>
              </>
            )}
            {authed && user && (
              <>
                <span>{user.name}님</span>
                <button onClick={handleLogout}>
                  <LogOut size={14} strokeWidth={2.2} aria-hidden="true" />
                  로그아웃
                </button>
              </>
            )}
          </div>
        </div>
        <div className="topbar-main">
          <div className="brand-group">
            <Link to="/" className="brand">
              <span className="brand-mark">
                <img src="/mzc-logo.png" alt="market cloud logo" />
              </span>
              <span className="brand-text">
                <span className="brand-name">market cloud</span>
                <span className="brand-caption">trendy cloud shopping</span>
              </span>
            </Link>
          </div>
          <form className="header-search" onSubmit={handleSearch}>
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="검색어를 입력해주세요"
              aria-label="상품 검색"
            />
            <button type="submit" aria-label="검색">
              <Search size={23} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </form>
          <nav className="nav">
            {authed && (
              <NavLink
                to="/cart"
                aria-label="장바구니"
                title="장바구니"
                className={({ isActive }) => `nav-link nav-icon cart-nav${isActive ? " active" : ""}`}
              >
                <ShoppingCart size={20} strokeWidth={2.2} aria-hidden="true" />
                {cartCount > 0 && <span className="cart-count-badge">{cartCount}</span>}
              </NavLink>
            )}
            {authed && (
              <NavLink to="/mypage" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                <User size={20} strokeWidth={2.2} aria-hidden="true" />
                <span className="sr-only">마이페이지</span>
              </NavLink>
            )}
          </nav>
        </div>
        <div className="categorybar">
          <div className="categorybar-inner">
            <button
              type="button"
              className="category-trigger"
              aria-label="카테고리 메뉴 열기"
              onClick={handleCategoryOpen}
            >
              <Menu size={22} strokeWidth={2.1} aria-hidden="true" />
              카테고리
            </button>
            <nav className="category-nav" aria-label="주요 카테고리">
              {categories.map((category) => (
                <button
                  key={category.value || "all"}
                  type="button"
                  className={currentCollection === category.value ? "active" : ""}
                  onClick={() => handleCategorySelect(category.value)}
                >
                  {category.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="footer-inner">
          <span>market cloud commerce</span>
          <span>trendy, energetic, conversion-focused</span>
        </div>
      </footer>
    </div>
  );
}
