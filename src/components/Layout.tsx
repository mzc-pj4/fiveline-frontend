import { Link, Outlet, useNavigate } from "react-router-dom";
import { clearSession, getUser, isAuthenticated } from "../auth";

export default function Layout() {
  const navigate = useNavigate();
  const user = getUser();
  const authed = isAuthenticated();

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg text-indigo-600">
            fiveline 샵
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/products" className="hover:underline">상품</Link>
            {authed && <Link to="/cart" className="hover:underline">장바구니</Link>}
            {authed && <Link to="/orders" className="hover:underline">주문</Link>}
            {!authed && (
              <>
                <Link to="/login" className="hover:underline">로그인</Link>
                <Link to="/signup" className="hover:underline">회원가입</Link>
              </>
            )}
            {authed && user && (
              <>
                <span className="text-gray-600">{user.name}님</span>
                <button onClick={handleLogout} className="text-red-600 hover:underline">
                  로그아웃
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto px-4 py-6 w-full">
        <Outlet />
      </main>
      <footer className="border-t bg-white text-xs text-gray-500 text-center py-3">
        fiveline · 운영 자동화 데모용 샘플 워크로드
      </footer>
    </div>
  );
}
