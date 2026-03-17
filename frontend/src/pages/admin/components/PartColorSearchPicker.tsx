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
  const [selectedItem, setSelectedItem] = useState<PartColor | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // CLOSE DROPDOWN
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

  // FETCH SELECTED ITEM IF NOT IN RESULTS
  useEffect(() => {
    if (!value) {
      setSelectedItem(null);
      return;
    }

    const existing = results.find((x) => x.id === value);
    if (existing) {
      setSelectedItem(existing);
      return;
    }

    let active = true;

    async function fetchSelected() {
      try {
        const res = await api.get(`${ENDPOINTS.partColors}${value}/`);
        if (!active) return;
        setSelectedItem(res.data as PartColor);
      } catch {
        // fail silently
      }
    }

    fetchSelected();

    return () => {
      active = false;
    };
  }, [value, results]);

  // SEARCH API
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

  const displayValue = useMemo(() => {
    if (open) return q;
    if (selectedItem) return partColorLabel(selectedItem);
    return "";
  }, [open, q, selectedItem]);

  return (
    <div className="relative" ref={rootRef}>
      <input
        className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        value={displayValue}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search part color..."
      />

      {open && (
        <div className="absolute z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
          {loading ? (
            <div className="px-4 py-3 text-sm text-slate-500">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">No results</div>
          ) : (
            <div className="p-2">
              {results.map((pc) => {
                const img =
                  pc.image_url_1 ||
                  pc.image_url_2 ||
                  pc.part?.image_url ||
                  "";

                return (
                  <button
                    key={pc.id}
                    type="button"
                    onClick={() => {
                      onChange(pc.id);
                      setSelectedItem(pc);
                      setQ("");
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50"
                  >
                    <div className="h-14 w-14 overflow-hidden rounded-xl border bg-slate-50">
                      {img ? (
                        <img
                          src={img}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-xs text-slate-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900">
                        {pc.part?.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {pc.part?.part_id} • {pc.color?.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}