import React, { useState } from "react";
import api from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { Link, useNavigate } from "react-router-dom";

export default function LoginPage({ onLogin }: { onLogin: () => Promise<void> | void }) {
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await api.post(ENDPOINTS.token, { identifier, password });
      localStorage.setItem("access_token", res.data.access);
      localStorage.setItem("refresh_token", res.data.refresh);
      await onLogin();
      nav("/");
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        (typeof e?.response?.data === "string" ? e.response.data : null) ||
        "Login failed";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <h2 style={S.h2}>Log in</h2>
        <p style={S.muted}>Use username or email.</p>

        {err && <div style={S.err}>{err}</div>}

        <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
          <label style={S.label}>
            Identifier
            <input style={S.input} value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          </label>

          <label style={S.label}>
            Password
            <input style={S.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          <button style={S.primaryBtn} disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <div style={S.footer}>
          New here? <Link to="/register">Create an account</Link>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 560, margin: "0 auto", padding: 24 },
  card: { border: "1px solid #e5e7eb", borderRadius: 18, padding: 18, background: "white" },
  h2: { margin: 0, fontSize: 22, letterSpacing: "-0.02em", color: "#0f172a" },
  muted: { margin: "6px 0 14px", color: "#475569" },
  err: { padding: 10, borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" },
  label: { display: "grid", gap: 6, fontWeight: 700, color: "#0f172a" },
  input: { border: "1px solid #e5e7eb", borderRadius: 12, padding: "10px 12px", fontSize: 14 },
  primaryBtn: {
    marginTop: 6,
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  footer: { marginTop: 14, color: "#475569" },
};
