import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import type {
  LibraryPickerMode,
  LibraryPickerResult,
  LibraryPickerType,
} from "../../../types/libraryPicker";
import { btnBase, cx, inputBase } from "../utils/ui";

const MODE_LABELS: Record<LibraryPickerMode, string> = {
  all: "All",
  part_color: "Part Colors",
  minifig: "Minifigs",
  set: "Sets",
  catalog: "Catalog",
};

function money(v?: string | null) {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return `$${n.toFixed(4)}`;
}

function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

export function GlobalLibraryPicker({
  mode = "all",
  allowedModes,
  title = "Search library",
  placeholder = "Search...",
  emptyText = "No results found.",
  onPick,
  autoFocus = false,
}: {
  mode?: LibraryPickerMode;
  allowedModes?: LibraryPickerMode[];
  title?: string;
  placeholder?: string;
  emptyText?: string;
  autoFocus?: boolean;
  onPick: (item: LibraryPickerResult) => void;
}) {
  const modes = useMemo<LibraryPickerMode[]>(
    () =>
      allowedModes?.length
        ? allowedModes
        : ["all", "part_color", "minifig", "set", "catalog"],
    [allowedModes]
  );

  const safeInitialMode = modes.includes(mode) ? mode : modes[0];

  const [activeMode, setActiveMode] = useState<LibraryPickerMode>(safeInitialMode);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<LibraryPickerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const debouncedQuery = useDebouncedValue(query, 250);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");

      try {
        const res = await api.get(ENDPOINTS.libraryPickerLookup, {
          params: {
            q: debouncedQuery,
            type: activeMode,
            limit: 40,
          },
        });

        if (!cancelled) {
          setRows(Array.isArray(res.data) ? res.data : []);
        }
      } catch (e: any) {
        if (!cancelled) {
          setRows([]);
          setError(
            e?.response?.data?.detail ||
              e?.message ||
              "Failed to load search results."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, activeMode]);

  const grouped = useMemo(() => {
    const map: Record<LibraryPickerType, LibraryPickerResult[]> = {
      part_color: [],
      minifig: [],
      set: [],
      catalog: [],
    };

    for (const row of rows) {
      map[row.type]?.push(row);
    }

    return map;
  }, [rows]);

  function ResultCard({ row }: { row: LibraryPickerResult }) {
    const colorHex = row.meta?.color_hex;
    const showSwatch = row.type === "part_color" && !!colorHex;
    const currentPrice = money(row.meta?.current_price);
    const currentCost = money(row.meta?.current_cost);

    return (
      <button
        type="button"
        onClick={() => onPick(row)}
        className="group flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-[1px] hover:border-slate-300 hover:bg-slate-50"
      >
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {row.image_url ? (
            <img
              src={row.image_url}
              alt={row.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              {row.type.replace("_", " ")}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-black text-slate-900">
              {row.title}
            </div>

            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              {MODE_LABELS[row.type]}
            </span>

            {showSwatch ? (
              <span
                className="inline-block h-4 w-4 rounded-full border border-slate-300 shadow-sm"
                style={{ backgroundColor: colorHex }}
              />
            ) : null}
          </div>

          <div className="mt-1 text-sm text-slate-600">{row.subtitle || "—"}</div>

          {(currentPrice || currentCost) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {currentPrice ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                  Price {currentPrice}
                </span>
              ) : null}
              {currentCost ? (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                  Cost {currentCost}
                </span>
              ) : null}
            </div>
          )}
        </div>

        <div className="pt-1 text-slate-300 transition group-hover:text-slate-500">↗</div>
      </button>
    );
  }

  function renderSection(type: LibraryPickerType) {
    if (!grouped[type]?.length) return null;

    return (
      <div className="space-y-2">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
          {MODE_LABELS[type]}
        </div>
        <div className="grid gap-2">
          {grouped[type].map((row) => (
            <ResultCard key={`${row.type}-${row.id}`} row={row} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Search
          </div>
          <div className="mt-1 text-lg font-black text-slate-900">{title}</div>
        </div>

        <div className="flex flex-wrap gap-2">
          {modes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setActiveMode(m)}
              className={cx(
                btnBase,
                "rounded-full px-4",
                activeMode === m
                  ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                  : ""
              )}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <input
          ref={inputRef}
          className={inputBase}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
        />
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          Searching…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">
          {emptyText}
        </div>
      ) : activeMode === "all" ? (
        <div className="space-y-5">
          {renderSection("part_color")}
          {renderSection("minifig")}
          {renderSection("set")}
          {renderSection("catalog")}
        </div>
      ) : (
        <div className="grid gap-2">
          {rows.map((row) => (
            <ResultCard key={`${row.type}-${row.id}`} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}