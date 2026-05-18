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
    <div className="max-w-sm mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">회원가입</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email" placeholder="이메일" value={email}
          onChange={(e) => setEmail(e.target.value)} required
          className="w-full border rounded px-3 py-2"
        />
        <input
          type="password" placeholder="비밀번호 (8자 이상)" value={password}
          onChange={(e) => setPassword(e.target.value)} required minLength={8}
          className="w-full border rounded px-3 py-2"
        />
        <input
          type="text" placeholder="이름" value={name}
          onChange={(e) => setName(e.target.value)} required
          className="w-full border rounded px-3 py-2"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit" disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "가입 중..." : "회원가입"}
        </button>
      </form>
      <p className="text-sm text-gray-500 mt-4 text-center">
        이미 계정 있어요? <Link to="/login" className="text-indigo-600 hover:underline">로그인</Link>
      </p>
    </div>
  );
}
