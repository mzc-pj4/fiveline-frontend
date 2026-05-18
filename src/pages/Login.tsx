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
    <div className="max-w-sm mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">로그인</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email" placeholder="이메일" value={email}
          onChange={(e) => setEmail(e.target.value)} required
          className="w-full border rounded px-3 py-2"
        />
        <input
          type="password" placeholder="비밀번호" value={password}
          onChange={(e) => setPassword(e.target.value)} required
          className="w-full border rounded px-3 py-2"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit" disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>
      <p className="text-sm text-gray-500 mt-4 text-center">
        계정 없어요? <Link to="/signup" className="text-indigo-600 hover:underline">회원가입</Link>
      </p>
    </div>
  );
}
