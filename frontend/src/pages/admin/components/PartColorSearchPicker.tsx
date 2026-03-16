import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import type { PartColor } from "../../../types/partColor";
import { getListData } from "../utils/list";

function partColorLabel(pc: PartColor) {
  const p = pc.part;
  const c = pc.color;
  return [
    p?.part_id ?? "PART",
    p?.name ?? "Unnamed Part",
    c?.name ?? "No Color",
    pc.variant ? `(${pc.variant})` : "",
  ]
    .filter(Boolean)
    .join(" — ");
}

export function PartColorSearchPicker({
  value,
  onChange,
}: {
  value: number | 0;
  onChange: (id: number) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PartColor[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => results.find((x) => x.id === value) ?? null,
    [results, value]
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    let active = true;

    async function run() {
      setLoading(true);
      try {
        const res = await api.get(ENDPOINTS.partColors, {
          params: q.trim() ? { q } : {},
        });
        if (!active) return;
        setResults(getListData<PartColor>(res.data).slice(0, 25));
      } finally {
        if (active) setLoading(false);
      }
    }

    const t = setTimeout(run, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="relative" ref={rootRef}>
      <input
        className="w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-200/70"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={selected ? partColorLabel(selected) : "Search part color..."}
        autoComplete="off"
      />

      {open ? (
        <div className="absolute z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {loading ? (
            <div className="px-4 py-3 text-sm text-slate-500">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">No results</div>
          ) : (
            <div className="p-2">
              {results.map((pc) => {
                const img = pc.image_url_1 || pc.image_url_2 || pc.part?.image_url || "";
                return (
                  <button
                    key={pc.id}
                    type="button"
                    onClick={() => {
                      onChange(pc.id);
                      setQ(partColorLabel(pc));
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      {img ? (
                        <img src={img} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-[10px] font-bold text-slate-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900">
                        {pc.part?.name || "Unnamed Part"}
                      </div>
                      <div className="truncate text-xs font-semibold text-slate-500">
                        {pc.part?.part_id} • {pc.color?.name}
                      </div>
                      <div className="truncate text-xs text-slate-400">
                        {pc.part_color_code}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}