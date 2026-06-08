import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserProfile, userApi } from "../api";
import { isAuthenticated, setSession, getToken } from "../auth";

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { navigate("/login"); return; }
    userApi.get<UserProfile>("/api/users/me")
      .then(({ data }) => {
        setProfile(data);
        setName(data.name);
        setPhone(data.phone ?? "");
      })
      .catch(() => navigate("/login"))
      .finally(() => setLoading(false));
  }, [navigate]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await userApi.put<UserProfile>("/api/users/me", {
        name: name.trim() || undefined,
        phone: phone.trim() || null,
      });
      setProfile(data);
      const token = getToken();
      if (token) setSession(token, { id: data.id, email: data.email, name: data.name, role: data.role });
      setEditing(false);
      showToast("프로필이 저장되었습니다");
    } catch (err: any) {
      showToast("저장 실패: " + (err.response?.data?.detail ?? err.message));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="max-w-lg mx-auto px-4 py-16 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-32 mb-6" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  );

  if (!profile) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-sm font-medium z-50 shadow-lg"
          style={{ background: "#111", color: "#fff" }}
        >
          {toast}
        </div>
      )}

      <h1 className="text-2xl font-black mb-8" style={{ color: "#111" }}>내 프로필</h1>

      {/* 프로필 카드 */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: "#fff", border: "1px solid #f0f0f0" }}>
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black"
            style={{ background: "#000", color: "#fff" }}
          >
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-lg" style={{ color: "#111" }}>{profile.name}</p>
            <p className="text-sm" style={{ color: "#888" }}>{profile.email}</p>
            <span
              className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: profile.role === "admin" ? "#000" : "#f3f4f6", color: profile.role === "admin" ? "#fff" : "#555" }}
            >
              {profile.role === "admin" ? "관리자" : "일반 회원"}
            </span>
          </div>
        </div>

        {!editing ? (
          <div className="space-y-3">
            <InfoRow label="이름" value={profile.name} />
            <InfoRow label="이메일" value={profile.email} />
            <InfoRow label="연락처" value={profile.phone ?? "미등록"} />
            <InfoRow label="가입일" value={new Date(profile.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })} />
            <button
              onClick={() => setEditing(true)}
              className="mt-4 w-full py-3 font-bold text-sm rounded-sm transition-colors"
              style={{ background: "#000", color: "#fff" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#222")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#000")}
            >
              프로필 수정
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#555" }}>이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={1}
                maxLength={100}
                className="w-full px-4 py-3 text-sm rounded-lg outline-none"
                style={{ border: "1px solid #e5e7eb", color: "#111" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#555" }}>연락처</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                maxLength={20}
                className="w-full px-4 py-3 text-sm rounded-lg outline-none"
                style={{ border: "1px solid #e5e7eb", color: "#111" }}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setEditing(false); setName(profile.name); setPhone(profile.phone ?? ""); }}
                className="flex-1 py-3 font-bold text-sm rounded-sm border"
                style={{ borderColor: "#ddd", color: "#555" }}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 font-bold text-sm rounded-sm transition-colors disabled:opacity-50"
                style={{ background: "#000", color: "#fff" }}
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "#f5f5f5" }}>
      <span className="text-xs font-medium" style={{ color: "#aaa" }}>{label}</span>
      <span className="text-sm" style={{ color: "#333" }}>{value}</span>
    </div>
  );
}
