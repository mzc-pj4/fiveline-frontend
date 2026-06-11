import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { userApi } from "../api";
import { setSession } from "../auth";

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await userApi.post("/api/auth/signup", { email, password, name, phone: phone || null });
      setSession(data.access_token, data.user);
      navigate("/products");
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "회원가입 실패");
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
          <p className="text-sm" style={{ color: "#888" }}>회원가입하고 다양한 혜택을 누리세요.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border px-4 py-4 text-sm outline-none transition-colors"
            style={{ borderColor: "#ddd", borderRadius: 2 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#000")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#ddd")}
          />
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
            placeholder="비밀번호 (8자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full border px-4 py-4 text-sm outline-none transition-colors"
            style={{ borderColor: "#ddd", borderRadius: 2 }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#000")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#ddd")}
          />
          <input
            type="tel"
            placeholder="전화번호 (선택, 예: 010-1234-5678)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm" style={{ color: "#aaa" }}>
          이미 계정이 있으신가요?{" "}
          <Link to="/login" className="font-medium underline" style={{ color: "#333" }}>
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
