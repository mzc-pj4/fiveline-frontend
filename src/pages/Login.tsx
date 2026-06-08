import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { userApi } from "../api";
import { setSession } from "../auth";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await userApi.post("/api/auth/login", { email, password });
      setSession(data.access_token, data.user);
      navigate("/products");
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "로그인 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center" style={{ background: "#f5f5f5" }}>
      <div className="w-full bg-white px-16 py-14" style={{ maxWidth: 560 }}>
        {/* 타이틀 */}
        <div className="text-center mb-10">
          <p className="font-black text-2xl tracking-widest mb-2">FIVELINE</p>
          <p className="text-sm" style={{ color: "#888" }}>패션 이커머스 서비스에 로그인하세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border px-4 py-4 text-sm outline-none transition-colors"
            style={{ borderColor: "#ddd", borderRadius: 2 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#000")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#ddd")}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border px-4 py-4 text-sm outline-none transition-colors"
            style={{ borderColor: "#ddd", borderRadius: 2 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#000")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#ddd")}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-4 text-sm font-bold tracking-widest disabled:opacity-50 transition-colors mt-2"
            style={{ background: loading ? "#555" : "#000", borderRadius: 2 }}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm" style={{ color: "#aaa" }}>
          아직 계정이 없으신가요?{" "}
          <Link to="/signup" className="font-medium underline" style={{ color: "#333" }}>
            회원가입
          </Link>
        </div>
      </div>
    </div>
  );
}
