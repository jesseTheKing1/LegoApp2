import React, { useState } from "react";
import api from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { Link, useNavigate } from "react-router-dom";

export default function RegisterPage() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await api.post(ENDPOINTS.register, { username, email, password });
      nav("/login");
    } catch (e: any) {
      const data = e?.response?.data;
      if (data && typeof data === "object") {
        // DRF validation dict -> turn into readable lines
        const lines: string[] = [];
        for (const [k, v] of Object.entries(data)) {
          if (Array.isArray(v)) lines.push(`${k}: ${v.join(" ")}`);
          else lines.push(`${k}: ${String(v)}`);
        }
        setErr(lines.join("\n"));
      } else {
        setErr("Registration failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <h2 style={S.h2}>Create account</h2>
        <p style={S.muted}>This makes a normal user. Admin is controlled in Django admin.</p>

        {err && <pre style={S.err}>{err}</pre>}

        <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
          <label style={S.label}>
            Username
            <input style={S.input} value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>

          <label style={S.label}>
            Email
            <input style={S.input} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label style={S.label}>
            Password
            <input style={S.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          <button style={S.primaryBtn} disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <div style={S.footer}>
          Already have one? <Link to="/login">Log in</Link>
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
  err: {
    whiteSpace: "pre-wrap",
    padding: 10,
    borderRadius: 12,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
  },
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
