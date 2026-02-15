// src/pages/admin/components/PartPicker.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Part } from "../../../types/part";
import { cx, inputBase, btnBase } from "../utils/ui";

function norm(s: unknown) {
  return String(s ?? "").toLowerCase().trim();
}

function partLabel(p: Part) {
  const pid = (p as any)?.part_id ?? "";
  const name = (p as any)?.name ?? "";
  return `${pid} — ${name}`.trim();
}

export function PartPicker({
  parts,
  value,
  onChange,
  placeholder = "Search parts… (id, name, category)",
  disabled,
}: {
  parts: Part[];
  value: number | "";
  onChange: (v: number | "") => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(() => {
    if (!value) return null;
    return parts.find((p) => p.id === Number(value)) ?? null;
  }, [parts, value]);

  // ✅ Make it obvious something happened:
  // when closed, show the selected label inside the input.
  const inputValue = useMemo(() => {
    if (open) return q;
    return selected ? partLabel(selected) : q;
  }, [open, q, selected]);

  // Filter results (cap for speed)
  const results = useMemo(() => {
    const qq = norm(q);

    // If user isn’t typing, still show first results (or recent list later)
    if (!qq) return parts.slice(0, 60);

    const out: Part[] = [];
    for (const p of parts) {
      const blob = [
        (p as any).part_id,
        (p as any).name,
        (p as any).general_category,
        (p as any).specific_category,
        (p as any).actual_category,
      ]
        .map(norm)
        .join(" ");

      if (blob.includes(qq)) out.push(p);
      if (out.length >= 60) break;
    }
    return out;
  }, [parts, q]);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // reset active index when query changes
  useEffect(() => {
    setActiveIdx(0);
  }, [q]);

  function selectPart(p: Part) {
    onChange(p.id);
    setOpen(false);
    setQ(""); // keep internal query clean; input will show selected label
    requestAnimationFrame(() => inputRef.current?.blur());
  }

  function clear() {
    onChange("");
    setQ("");
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const p = results[activeIdx];
      if (p) selectPart(p);
      return;
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          className={cx(inputBase, "pr-24")}
          value={inputValue}
          onChange={(e) => {
            // typing means “search mode”
            if (!open) setOpen(true);
            setQ(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />

        {selected ? (
          <button
            type="button"
            className={cx(btnBase, "absolute right-2 top-1/2 -translate-y-1/2 h-9 px-3")}
            onClick={clear}
            disabled={disabled}
            title="Clear selected part"
          >
            Clear
          </button>
        ) : (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            onClick={() => setOpen((v) => !v)}
            disabled={disabled}
            aria-label="Toggle results"
          >
            {open ? "Hide" : "Show"}
          </button>
        )}
      </div>

      {open ? (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-600">No matches.</div>
          ) : (
            <div className="max-h-[340px] overflow-auto">
              {results.map((p, idx) => {
                const active = idx === activeIdx;
                const img = (p as any)?.image_url ?? "";

                return (
                  <button
                    key={p.id}
                    type="button"
                    className={cx(
                      "w-full text-left px-3 py-2 border-t border-slate-100",
                      "flex items-center gap-3",
                      active ? "bg-slate-900 text-white" : "hover:bg-slate-50"
                    )}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => selectPart(p)}
                  >
                    {/* ✅ Thumbnail */}
                    <div className="h-10 w-10 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                      {img ? (
                        <img
                          src={img}
                          alt=""
                          className="h-full w-full object-contain"
                          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                        />
                      ) : (
                        <div className={cx("text-[10px] font-black", active ? "text-white/60" : "text-slate-400")}>
                          —
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className={cx("text-sm font-extrabold truncate", active ? "text-white" : "text-slate-900")}>
                        {(p as any).part_id} — {(p as any).name}
                      </div>

                      {(p as any)?.general_category || (p as any)?.actual_category ? (
                        <div className={cx("text-xs font-semibold truncate", active ? "text-white/80" : "text-slate-500")}>
                          {(p as any)?.general_category ? (p as any).general_category : "Uncategorized"}
                          {(p as any)?.actual_category ? ` • ${(p as any).actual_category}` : ""}
                        </div>
                      ) : null}
                    </div>

                    {selected?.id === p.id ? (
                      <div className="shrink-0 h-6 w-6 rounded-full bg-white text-slate-900 flex items-center justify-center text-xs font-black">
                        ✓
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}

          <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
            Enter selects • Esc closes • ↑/↓ navigate
          </div>
        </div>
      ) : null}
    </div>
  );
}
