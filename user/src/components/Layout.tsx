import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useNavigate, useSearchParams } from "react-router-dom";
import { orderApi } from "../api";
import { clearSession, getUser, isAuthenticated } from "../auth";

export default function Layout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = getUser();
  const authed = isAuthenticated();
  const [cartCount, setCartCount] = useState(0);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authed) { setCartCount(0); return; }
    orderApi.get("/api/cart").then((res) => {
      setCartCount(res.data.items?.length ?? 0);
    }).catch(() => {});
  }, [authed]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) navigate(`/products?q=${encodeURIComponent(q.trim())}`);
    else navigate("/products");
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f5f5f5" }}>
      {/* 상단 헤더 - 블랙 */}
      <header className="sticky top-0 z-50" style={{ background: "#000" }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* 로고 */}
          <Link to="/" className="font-black text-2xl tracking-[0.2em] shrink-0" style={{ color: "#fff", letterSpacing: "0.2em" }}>
            FIVELINE
          </Link>

          {/* 검색창 */}
          <form onSubmit={handleSearch} className="flex-1 max-w-lg mx-4">
            <div className="flex items-center bg-white rounded-sm overflow-hidden">
              <input
                type="text"
                placeholder="브랜드, 상품명 검색"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="flex-1 px-4 py-2 text-sm text-gray-900 outline-none"
              />
              <button type="submit" className="px-3 py-2 text-gray-400 hover:text-gray-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
            </div>
          </form>

          {/* 우측 아이콘 */}
          <div className="flex items-center gap-5 ml-auto">
            {!authed ? (
              <>
                <Link to="/login" className="text-sm hover:text-gray-300" style={{ color: "rgba(255,255,255,0.8)" }}>로그인</Link>
                <Link to="/signup" className="text-sm hover:text-gray-300" style={{ color: "rgba(255,255,255,0.8)" }}>회원가입</Link>
              </>
            ) : (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu((v) => !v)}
                  className="text-sm flex items-center gap-1 hover:text-gray-300"
                  style={{ color: "rgba(255,255,255,0.8)" }}
                >
                  <span>👤</span>
                  <span>{user?.name}님</span>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-9 bg-white text-gray-900 rounded shadow-xl w-44 py-1 z-50 border">
                    <Link to="/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50" onClick={() => setShowUserMenu(false)}>
                      내 프로필
                    </Link>
                    <Link to="/orders" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50" onClick={() => setShowUserMenu(false)}>
                      주문내역
                    </Link>
                    <div className="border-t my-1" />
                    <button
                      onClick={() => { clearSession(); navigate("/login"); setShowUserMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 text-red-500"
                    >
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 장바구니 */}
            <Link to="/cart" className="flex items-center gap-1.5 hover:text-gray-300 transition-colors" style={{ color: "rgba(255,255,255,0.85)" }}>
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                {cartCount > 0 && (
                  <span
                    className="absolute -top-2 -right-2 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold"
                    style={{ background: "#ef4444", fontSize: "9px" }}
                  >
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium">장바구니</span>
            </Link>
          </div>
        </div>

      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer style={{ background: "#111", color: "rgba(255,255,255,0.4)" }} className="text-xs text-center py-10 mt-8">
        <p className="font-black text-white text-base mb-2 tracking-widest">FIVELINE</p>
        <p className="mb-1">패션 이커머스 · 메가존 클라우드 파이널 프로젝트 데모</p>
        <p>© 2026 fiveline. All rights reserved.</p>
      </footer>
    </div>
  );
}
