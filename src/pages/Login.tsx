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
    <div className="auth-wrap">
      <section className="auth-card surface">
      <p className="eyebrow">Account</p>
      <h1 className="page-title">로그인</h1>
      <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: 20 }}>
        <input
          type="email" placeholder="이메일" value={email}
          onChange={(e) => setEmail(e.target.value)} required
          className="field"
        />
        <input
          type="password" placeholder="비밀번호" value={password}
          onChange={(e) => setPassword(e.target.value)} required
          className="field"
        />
        {error && <p className="toast error">{error}</p>}
        <button
          type="submit" disabled={loading}
          className="btn btn-primary btn-full"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>
      <p className="small muted" style={{ marginTop: 18, textAlign: "center" }}>
        계정이 없으신가요? <Link to="/signup" style={{ color: "#195b63", fontWeight: 800 }}>회원가입</Link>
      </p>
      </section>
    </div>
  );
}
