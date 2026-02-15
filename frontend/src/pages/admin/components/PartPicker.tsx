// src/pages/admin/components/PartPicker.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Part } from "../../../types/part";
import { cx, inputBase, btnBase } from "../utils/ui";

function norm(s: unknown) {
  return String(s ?? "").toLowerCase().trim();
}

function partLabel(p: Part) {
  return `${p.part_id ?? ""} — ${p.name ?? ""}`.trim();
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

  const selected = useMemo(
    () => (value ? parts.find((p) => p.id === Number(value)) ?? null : null),
    [parts, value]
  );

  // Filter parts by query (include category fields if you have them on Part)
  const results = useMemo(() => {
    const qq = norm(q);
    if (!qq) return parts.slice(0, 50);

    const out: Part[] = [];
    for (const p of parts) {
      const blob = [
        p.part_id,
        p.name,
        (p as any).general_category,
        (p as any).specific_category,
        (p as any).actual_category,
      ]
        .map(norm)
        .join(" ");

      if (blob.includes(qq)) out.push(p);
      if (out.length >= 50) break; // cap results for speed
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

  // Reset active index when list changes
  useEffect(() => {
    setActiveIdx(0);
  }, [q]);

  function selectPart(p: Part) {
    onChange(p.id);
    setOpen(false);
    setQ("");
    // keep focus where user is working
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function clear() {
    onChange("");
    setQ("");
    setOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function onKeyDown(e: React.KeyboardEvent) {
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
    <div ref={wrapRef} className="space-y-2">
      {/* Selected card */}
      {selected ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-black text-slate-600">Selected Part</div>
            <div className="mt-0.5 text-sm font-extrabold text-slate-900 truncate">
              {selected.part_id} — {selected.name}
            </div>
            {(selected as any)?.general_category ? (
              <div className="mt-0.5 text-xs font-semibold text-slate-600 truncate">
                {(selected as any).general_category}
                {(selected as any).actual_category ? ` • ${(selected as any).actual_category}` : ""}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className={cx(btnBase, "h-9 px-3")}
            onClick={clear}
            disabled={disabled}
            title="Clear selection"
          >
            Change
          </button>
        </div>
      ) : null}

      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          className={cx(inputBase, "pr-10")}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />

        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
          aria-label="Toggle results"
        >
          {open ? "▲" : "▼"}
        </button>

        {/* Results dropdown */}
        {open ? (
          <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            {results.length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-600">No matches.</div>
            ) : (
              <div className="max-h-[320px] overflow-auto">
                {results.map((p, idx) => {
                  const active = idx === activeIdx;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={cx(
                        "w-full text-left px-3 py-2 border-t border-slate-100",
                        active ? "bg-slate-900 text-white" : "hover:bg-slate-50"
                      )}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => selectPart(p)}
                    >
                      <div className={cx("text-sm font-extrabold truncate", active ? "text-white" : "text-slate-900")}>
                        {p.part_id} — {p.name}
                      </div>
                      {(p as any)?.general_category || (p as any)?.actual_category ? (
                        <div className={cx("text-xs font-semibold truncate", active ? "text-white/80" : "text-slate-500")}>
                          {(p as any)?.general_category ? (p as any).general_category : "Uncategorized"}
                          {(p as any)?.actual_category ? ` • ${(p as any).actual_category}` : ""}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
              Tip: type “3001” or “brick” or a category. Enter selects. Esc closes.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
