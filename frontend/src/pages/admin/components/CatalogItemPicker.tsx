import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import type { CatalogLookupItem } from "../../../types/catalogLookup";
import { formatApiError } from "src/pages/admin/utils/errors";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

const inputBase =
  "w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-4 focus:ring-slate-200/70";

const badgeMap: Record<string, string> = {
  minifig: "bg-indigo-50 text-indigo-700 border-indigo-200",
  part_color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  catalog: "bg-slate-50 text-slate-700 border-slate-200",
};

export function CatalogItemPicker({
  value,
  onChange,
}: {
  value: CatalogLookupItem | null;
  onChange: (item: CatalogLookupItem | null) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CatalogLookupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      setErr(null);

      try {
        const res = await api.get(ENDPOINTS.catalogLookup, {
          params: { q, limit: 20 },
        });
        setResults(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        setErr(formatApiError(e));
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [q, open]);

  const selectedPrice = useMemo(() => {
    if (!value?.current_price && value?.current_price !== 0) return null;
    return `$${value.current_price}`;
  }, [value]);

  return (
    <div className="space-y-3">
      {value ? (
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {value.display_image_url ? (
                <img
                  src={value.display_image_url}
                  alt=""
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-[10px] font-semibold text-slate-400">
                  No image
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="truncate text-sm font-black text-slate-950">
                  {value.display_name}
                </div>

                <span
                  className={cx(
                    "rounded-full border px-2.5 py-1 text-[11px] font-black",
                    badgeMap[value.product_type] || badgeMap.catalog
                  )}
                >
                  {value.product_type.replace("_", " ")}
                </span>

                {selectedPrice ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-700">
                    {selectedPrice}
                  </span>
                ) : null}
              </div>

              <div className="mt-1 text-xs font-semibold text-slate-500">
                {value.sku}
              </div>

              {value.subtitle ? (
                <div className="mt-1 text-xs text-slate-500">{value.subtitle}</div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => {
                setOpen(true);
                setQ("");
              }}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-50"
            >
              Change
            </button>

            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setQ("");
          }}
          className="w-full rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-left hover:bg-slate-100"
        >
          <div className="text-sm font-black text-slate-900">Select catalog item</div>
          <div className="mt-1 text-sm text-slate-500">
            Search by SKU, minifig name, BrickLink ID, part ID, or color.
          </div>
        </button>
      )}

      {open ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.10)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-950">Find catalog item</div>
              <div className="text-xs text-slate-500">
                Search across minifigs and part-colors
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          <input
            className={inputBase}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search SKU, name, part ID, BrickLink ID..."
            autoFocus
          />

          {err ? (
            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Searching…
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No results found.
              </div>
            ) : (
              results.map((item) => {
                const price =
                  item.current_price || item.current_price === 0
                    ? `$${item.current_price}`
                    : null;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-4 rounded-[24px] border border-slate-200 bg-white p-3 text-left hover:bg-slate-50"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      {item.display_image_url ? (
                        <img
                          src={item.display_image_url}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-[10px] font-semibold text-slate-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-black text-slate-950">
                          {item.display_name}
                        </div>

                        <span
                          className={cx(
                            "rounded-full border px-2.5 py-1 text-[11px] font-black",
                            badgeMap[item.product_type] || badgeMap.catalog
                          )}
                        >
                          {item.product_type.replace("_", " ")}
                        </span>

                        {price ? (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-700">
                            {price}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        {item.sku}
                      </div>

                      {item.subtitle ? (
                        <div className="mt-1 truncate text-xs text-slate-500">
                          {item.subtitle}
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}