import React, { useEffect, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";

export function GlobalLibraryPicker({
  mode,
  title,
  placeholder,
  onPick,
}: {
  mode: "part_color" | "minifig" | "set" | "catalog" | "all";
  title: string;
  placeholder?: string;
  onPick: (item: any) => void;
}) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [raw, setRaw] = useState<any>(null);

  useEffect(() => {
    const q = query.trim();

    if (q.length < 2) {
      setRows([]);
      setRaw(null);
      setError("");
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const res = await api.get(ENDPOINTS.libraryPickerLookup, {
          params: {
            q,
            type: mode,
            limit: 25,
          },
        });

        console.log("PICKER MODE:", mode);
        console.log("PICKER QUERY:", q);
        console.log("PICKER RAW RESPONSE:", res.data);

        setRaw(res.data);
        setRows(Array.isArray(res.data) ? res.data : []);
      } catch (e: any) {
        console.error("PICKER ERROR:", e);
        setRaw(null);
        setRows([]);
        setError(
          e?.response?.data?.detail ||
            e?.message ||
            "Failed to load picker results."
        );
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, mode]);

  return (
    <div className="space-y-3">
      <div className="text-sm font-black text-slate-900">{title}</div>

      <input
        className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder || "Search..."}
      />

      <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Mode: <strong>{mode}</strong> | Query length: <strong>{query.trim().length}</strong>
      </div>

      {query.trim().length < 2 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          Type at least 2 characters.
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          Searching...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            No results found.
          </div>

          <pre className="max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-white p-3 text-[11px] text-slate-700">
            {JSON.stringify(raw, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="space-y-1 rounded-2xl border border-slate-200 bg-white p-2">
          {rows.map((row) => (
            <button
              key={`${row.type}-${row.id}`}
              type="button"
              onClick={() => {
                console.log("PICKED:", row);
                onPick(row);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-slate-50"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">{row.title}</div>
                <div className="text-xs text-slate-500">{row.subtitle || "—"}</div>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {row.type}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}