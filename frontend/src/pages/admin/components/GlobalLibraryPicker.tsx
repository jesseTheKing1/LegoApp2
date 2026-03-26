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

const RECENT_KEY = "global-library-picker-recent-v1";

function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

function loadRecent(): LibraryPickerResult[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecent(item: LibraryPickerResult) {
  try {
    const existing = loadRecent();
    const next = [
      item,
      ...existing.filter((x) => !(x.id === item.id && x.type === item.type)),
    ].slice(0, 12);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
}

type GroupedRows = {
  label: string;
  key: string;
  rows?: LibraryPickerResult[];
  children?: GroupedRows[];
};

function groupResults(
  rows: LibraryPickerResult[],
  activeMode: LibraryPickerMode
): GroupedRows[] {
  const typeOrder: LibraryPickerType[] = ["part_color", "minifig", "set", "catalog"];

  const typeFiltered =
    activeMode === "all" ? rows : rows.filter((r) => r.type === activeMode);

  const byType = new Map<string, LibraryPickerResult[]>();
  for (const row of typeFiltered) {
    if (!byType.has(row.type)) byType.set(row.type, []);
    byType.get(row.type)!.push(row);
  }

  const groups: GroupedRows[] = [];

  for (const type of typeOrder) {
    const typeRows = byType.get(type);
    if (!typeRows?.length) continue;

    if (type === "part_color") {
      const generalMap = new Map<string, Map<string, LibraryPickerResult[]>>();

      for (const row of typeRows) {
        const primary = row.meta?.general_category || "Other";
        const secondary = row.meta?.specific_category || "Other";

        if (!generalMap.has(primary)) generalMap.set(primary, new Map());
        const specMap = generalMap.get(primary)!;

        if (!specMap.has(secondary)) specMap.set(secondary, []);
        specMap.get(secondary)!.push(row);
      }

      groups.push({
        key: `type:${type}`,
        label: MODE_LABELS[type],
        children: Array.from(generalMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([general, specMap]) => ({
            key: `type:${type}:general:${general}`,
            label: general,
            children: Array.from(specMap.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([specific, specRows]) => ({
                key: `type:${type}:general:${general}:specific:${specific}`,
                label: specific,
                rows: [...specRows].sort((a, b) => {
                  const a1 = a.meta?.part_id || "";
                  const b1 = b.meta?.part_id || "";
                  if (a1 !== b1) return a1.localeCompare(b1);
                  return a.title.localeCompare(b.title);
                }),
              })),
          })),
      });
    } else if (type === "minifig" || type === "set") {
      const themeMap = new Map<string, LibraryPickerResult[]>();

      for (const row of typeRows) {
        const theme = row.meta?.theme_name || "No Theme";
        if (!themeMap.has(theme)) themeMap.set(theme, []);
        themeMap.get(theme)!.push(row);
      }

      groups.push({
        key: `type:${type}`,
        label: MODE_LABELS[type],
        children: Array.from(themeMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([theme, themeRows]) => ({
            key: `type:${type}:theme:${theme}`,
            label: theme,
            rows: [...themeRows].sort((a, b) => a.title.localeCompare(b.title)),
          })),
      });
    } else {
      groups.push({
        key: `type:${type}`,
        label: MODE_LABELS[type],
        rows: [...typeRows].sort((a, b) => a.title.localeCompare(b.title)),
      });
    }
  }

  return groups;
}

function ResultRow({
  row,
  onPick,
}: {
  row: LibraryPickerResult;
  onPick: (item: LibraryPickerResult) => void;
}) {
  const colorHex = row.meta?.color_hex;
  const isPart = row.type === "part_color";

  return (
    <button
      type="button"
      onClick={() => onPick(row)}
      className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-100"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        {row.image_url ? (
          <img src={row.image_url} alt={row.title} className="h-full w-full object-cover" />
        ) : isPart && colorHex ? (
          <span
            className="h-5 w-5 rounded-full border border-slate-300"
            style={{ backgroundColor: colorHex }}
          />
        ) : (
          <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            {row.type}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-900">{row.title}</div>
        <div className="truncate text-xs text-slate-500">{row.subtitle || "—"}</div>
      </div>

      <div className="shrink-0 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        select
      </div>
    </button>
  );
}

function ExpandableGroup({
  group,
  openMap,
  setOpenMap,
  onPick,
  defaultOpen = false,
}: {
  group: GroupedRows;
  openMap: Record<string, boolean>;
  setOpenMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onPick: (item: LibraryPickerResult) => void;
  defaultOpen?: boolean;
}) {
  const isOpen = openMap[group.key] ?? defaultOpen;

  const toggle = () => {
    setOpenMap((prev) => ({
      ...prev,
      [group.key]: !isOpen,
    }));
  };

  const rowCount =
    group.rows?.length ||
    group.children?.reduce((sum, child) => {
      if (child.rows) return sum + child.rows.length;
      if (child.children) {
        return (
          sum +
          child.children.reduce((inner, c) => inner + (c.rows?.length || 0), 0)
        );
      }
      return sum;
    }, 0) ||
    0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left hover:bg-slate-50"
      >
        <div>
          <div className="text-sm font-black text-slate-900">{group.label}</div>
          <div className="text-[11px] font-medium text-slate-500">{rowCount} items</div>
        </div>
        <div className={cx("text-slate-400 transition", isOpen && "rotate-90")}>›</div>
      </button>

      {isOpen ? (
        <div className="border-t border-slate-100 p-2">
          {group.children?.length ? (
            <div className="space-y-2">
              {group.children.map((child) => (
                <ExpandableGroup
                  key={child.key}
                  group={child}
                  openMap={openMap}
                  setOpenMap={setOpenMap}
                  onPick={onPick}
                />
              ))}
            </div>
          ) : group.rows?.length ? (
            <div className="space-y-1">
              {group.rows.map((row) => (
                <ResultRow key={`${row.type}-${row.id}`} row={row} onPick={onPick} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function GlobalLibraryPicker({
  mode = "all",
  allowedModes,
  title = "Search library",
  placeholder = "Search...",
  emptyText = "No results found.",
  autoFocus = false,
  onPick,
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
  const [recentRows, setRecentRows] = useState<LibraryPickerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const cacheRef = useRef<Record<string, LibraryPickerResult[]>>({});

  const debouncedQuery = useDebouncedValue(query, 250);

  useEffect(() => {
    setRecentRows(loadRecent());
  }, []);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const q = debouncedQuery.trim();
    const cacheKey = `${activeMode}::${q || "__default__"}`;

    let cancelled = false;

    async function run() {
      if (cacheRef.current[cacheKey]) {
        setRows(cacheRef.current[cacheKey]);
        setLoading(false);
        setError("");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const res = await api.get(ENDPOINTS.libraryPickerLookup, {
          params: {
            q,
            type: activeMode,
            limit: 60,
          },
        });

        const nextRows = Array.isArray(res.data) ? res.data : [];
        cacheRef.current[cacheKey] = nextRows;

        if (!cancelled) {
          setRows(nextRows);
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

  useEffect(() => {
    const groups = groupResults(rows, activeMode);
    const nextOpen: Record<string, boolean> = {};

    function markOpen(items: GroupedRows[]) {
      for (const item of items) {
        nextOpen[item.key] = true;
        if (item.children?.length) markOpen(item.children);
      }
    }

    markOpen(groups);
    setOpenMap(nextOpen);
  }, [rows, activeMode]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery, activeMode]);

  const grouped = useMemo(() => groupResults(rows, activeMode), [rows, activeMode]);

  const filteredRecent = useMemo(() => {
    return recentRows.filter((row) =>
      activeMode === "all" ? true : row.type === activeMode
    );
  }, [recentRows, activeMode]);

  const flatSearchRows = useMemo(() => {
    const source = activeMode === "all" ? rows : rows.filter((r) => r.type === activeMode);
    return source.slice(0, 30);
  }, [rows, activeMode]);

  function handlePick(item: LibraryPickerResult) {
    saveRecent(item);
    setRecentRows(loadRecent());
    onPick(item);
  }

  function moveActive(delta: number) {
    if (!flatSearchRows.length) return;
    setActiveIndex((prev) => {
      const next = prev + delta;
      if (next < 0) return flatSearchRows.length - 1;
      if (next >= flatSearchRows.length) return 0;
      return next;
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!debouncedQuery.trim()) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
      return;
    }

    if (e.key === "Enter") {
      if (!flatSearchRows.length) return;
      e.preventDefault();
      handlePick(flatSearchRows[activeIndex] || flatSearchRows[0]);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
          Search
        </div>
        <div className="mt-1 text-base font-black text-slate-900">{title}</div>
      </div>

      <div className="flex flex-wrap gap-2">
        {modes.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setActiveMode(m)}
            className={cx(
              btnBase,
              "rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em]",
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
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />

      {!debouncedQuery.trim() ? (
        <div className="space-y-3">
          {filteredRecent.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                Recent Picks
              </div>
              <div className="space-y-1">
                {filteredRecent.map((row) => (
                  <ResultRow
                    key={`recent-${row.type}-${row.id}`}
                    row={row}
                    onPick={handlePick}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              Loading…
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : grouped.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No items available.
            </div>
          ) : (
            <div className="space-y-3">
              {grouped.map((group, idx) => (
                <ExpandableGroup
                  key={group.key}
                  group={group}
                  openMap={openMap}
                  setOpenMap={setOpenMap}
                  onPick={handlePick}
                  defaultOpen={idx === 0}
                />
              ))}
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          Searching…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : flatSearchRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-2">
          <div className="mb-2 px-2 pt-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
            Best Matches
          </div>
          <div className="space-y-1">
            {flatSearchRows.map((row, idx) => (
              <button
                key={`${row.type}-${row.id}`}
                type="button"
                onClick={() => handlePick(row)}
                className={cx(
                  "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition",
                  idx === activeIndex ? "bg-slate-100" : "hover:bg-slate-100"
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  {row.image_url ? (
                    <img src={row.image_url} alt={row.title} className="h-full w-full object-cover" />
                  ) : row.type === "part_color" && row.meta?.color_hex ? (
                    <span
                      className="h-5 w-5 rounded-full border border-slate-300"
                      style={{ backgroundColor: row.meta.color_hex }}
                    />
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                      {row.type}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">{row.title}</div>
                  <div className="truncate text-xs text-slate-500">{row.subtitle || "—"}</div>
                </div>

                <div className="shrink-0 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                  select
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}