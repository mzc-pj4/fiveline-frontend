import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { userApi } from "../api";
import { setSession } from "../auth";

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await userApi.post("/api/auth/signup", { email, password, name });
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
    <div className="auth-wrap">
      <section className="auth-card surface">
      <p className="eyebrow">Account</p>
      <h1 className="page-title">회원가입</h1>
      <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: 20 }}>
        <input
          type="email" placeholder="이메일" value={email}
          onChange={(e) => setEmail(e.target.value)} required
          className="field"
        />
        <input
          type="password" placeholder="비밀번호 (8자 이상)" value={password}
          onChange={(e) => setPassword(e.target.value)} required minLength={8}
          className="field"
        />
        <input
          type="text" placeholder="이름" value={name}
          onChange={(e) => setName(e.target.value)} required
          className="field"
        />
        {error && <p className="toast error">{error}</p>}
        <button
          type="submit" disabled={loading}
          className="btn btn-primary btn-full"
        >
          {loading ? "가입 중..." : "회원가입"}
        </button>
      </form>
      <p className="small muted" style={{ marginTop: 18, textAlign: "center" }}>
        이미 계정이 있으신가요? <Link to="/login" style={{ color: "#195b63", fontWeight: 800 }}>로그인</Link>
      </p>
      </section>
    </div>
  );
}
