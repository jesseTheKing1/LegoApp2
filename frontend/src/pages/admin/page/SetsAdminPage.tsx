import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";

import type { CatalogItemMini } from "../../../types/catalog";
import type { Theme, Minifig } from "../../../types/minifig";
import type { PartColorRow } from "../../../types/partColor";
import type { LegoSet, SetPayload } from "../../../types/set";

import { DrawerShell } from "../components/DrawerShell";
import { SetForm } from "../form/SetForm";
import { SetDetailDrawer } from "../components/SetDetailDrawer";
import { getListData } from "../utils/list";
import { formatApiError } from "../utils/errors";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

const inputBase =
  "w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition " +
  "placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-200/70";

const shellCard =
  "rounded-[28px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]";

export default function SetsAdminPage() {
  const [items, setItems] = useState<LegoSet[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItemMini[]>([]);
  const [partColors, setPartColors] = useState<PartColorRow[]>([]);
  const [minifigs, setMinifigs] = useState<Minifig[]>([]);

  const [loadingSets, setLoadingSets] = useState(true);
  const [loadingLookups, setLoadingLookups] = useState(true);

  const [q, setQ] = useState("");
  const [themeFilter, setThemeFilter] = useState<string>("");

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<LegoSet | null>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadSets() {
    setErr(null);
    setLoadingSets(true);

    try {
      const setRes = await api.get(ENDPOINTS.sets);
      setItems(getListData<LegoSet>(setRes.data));
    } finally {
      setLoadingSets(false);
    }
  }

  async function loadLookups() {
    setErr(null);
    setLoadingLookups(true);

    try {
      const [themeRes, catRes, partColorRes, minifigRes] = await Promise.all([
        api.get(ENDPOINTS.themes),
        api.get(ENDPOINTS.catalog),
        api.get(ENDPOINTS.partColors),
        api.get(ENDPOINTS.minifigs),
      ]);

      setThemes(getListData<Theme>(themeRes.data));
      setCatalogItems(getListData<CatalogItemMini>(catRes.data));
      setPartColors(getListData<PartColorRow>(partColorRes.data));
      setMinifigs(getListData<Minifig>(minifigRes.data));
    } finally {
      setLoadingLookups(false);
    }
  }

  useEffect(() => {
    loadSets().catch((e) => setErr(formatApiError(e)));
    loadLookups().catch((e) => setErr(formatApiError(e)));
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !qq ||
        `${item.set_num ?? ""} ${item.name ?? ""} ${item.theme?.name ?? ""}`
          .toLowerCase()
          .includes(qq);

      const matchesTheme = !themeFilter || String(item.theme?.id ?? "") === themeFilter;

      return matchesSearch && matchesTheme;
    });
  }, [items, q, themeFilter]);

  const stats = useMemo(() => {
    const withPrice = items.filter((x) => x.catalog_item?.base_price_override != null).length;
    const withParts = items.filter((x) => (x.parts?.length ?? 0) > 0).length;
    const withMinifigs = items.filter((x) => (x.minifigs?.length ?? 0) > 0).length;
    const withoutTheme = items.filter((x) => !x.theme?.id).length;

    return {
      total: items.length,
      withPrice,
      withParts,
      withMinifigs,
      withoutTheme,
    };
  }, [items]);

  function openDetail(item: LegoSet) {
    setSelected(item);
    setDetailOpen(true);
    setErr(null);
  }

  function applyPatched(item: LegoSet) {
    setSelected(item);
    setItems((prev) => prev.map((x) => (x.id === item.id ? item : x)));
  }

  async function create(payload: SetPayload) {
    setSaving(true);
    setErr(null);

    try {
      await api.post(ENDPOINTS.sets, payload);
      setCreateOpen(false);
      await loadSets();
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: "Sets", value: stats.total },
          { label: "With pricing", value: stats.withPrice },
          { label: "With parts", value: stats.withParts },
          { label: "With minifigs", value: stats.withMinifigs },
          { label: "No theme", value: stats.withoutTheme },
        ].map((stat) => (
          <div key={stat.label} className={shellCard}>
            <div className="p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                {stat.label}
              </div>
              <div className="mt-1 text-2xl font-black text-slate-950">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={shellCard}>
        <div className="border-b border-slate-200/80 px-5 py-4">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Sets admin
          </div>
          <div className="mt-1 text-lg font-black text-slate-950">
            Build premium set records with real structure rules
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <input
              className={cx(inputBase, "xl:max-w-md")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search set number, name, or theme..."
              autoComplete="off"
            />

            <select
              className="w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-4 focus:ring-slate-200/70 xl:w-[220px]"
              value={themeFilter}
              onChange={(e) => setThemeFilter(e.target.value)}
            >
              <option value="">All themes</option>
              {themes.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name}
                </option>
              ))}
            </select>

            <div className="flex flex-wrap gap-2 xl:ml-auto">
              <button
                type="button"
                className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                onClick={() => {
                  setSelected(null);
                  setErr(null);
                  setCreateOpen(true);
                }}
              >
                + New set
              </button>

              <button
                type="button"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50"
                onClick={() => {
                  loadSets().catch(() => {});
                  loadLookups().catch(() => {});
                }}
              >
                Refresh
              </button>
            </div>
          </div>

          {err ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          {loadingSets && items.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
              <div className="text-sm font-semibold text-slate-700">Loading sets…</div>
              <div className="mt-1 text-sm text-slate-500">
                The set list should appear shortly.
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
              <div className="text-sm font-semibold text-slate-700">No results</div>
              <div className="mt-1 text-sm text-slate-500">
                Try another search or create a new set.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((item) => {
                const salesPrice = item.catalog_item?.current_price ?? item.catalog_item?.base_price_override;
                const partCount = item.parts?.length ?? 0;
                const minifigCount = item.minifigs?.length ?? 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openDetail(item)}
                    className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white text-left shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]"
                  >
                    <div className="relative aspect-square bg-[radial-gradient(circle_at_top,#f8fafc,white_62%)] p-4">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt=""
                          className="h-full w-full object-contain drop-shadow-[0_14px_30px_rgba(15,23,42,0.16)] transition group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="grid h-full place-items-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-400">
                          No image
                        </div>
                      )}

                      {salesPrice && (
                        <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-900 shadow-sm">
                          ${salesPrice}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-base font-black text-slate-950">
                            {item.name}
                          </div>
                          <div className="mt-1 truncate text-sm font-semibold text-slate-500">
                            {item.set_num}
                          </div>
                        </div>

                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700">
                          {item.theme?.name || "No theme"}
                        </span>

                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700">
                          {item.official_piece_count || 0} pieces
                        </span>

                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700">
                          {partCount} part rows
                        </span>

                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700">
                          {minifigCount} minifigs
                        </span>
                      </div>

                      <div className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                        Open editor →
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <DrawerShell
        open={createOpen}
        title="New Set"
        onClose={() => {
          setCreateOpen(false);
          setErr(null);
        }}
        width={1440}
      >
        <SetForm
          themes={themes}
          catalogItems={catalogItems}
          partColors={partColors}
          minifigs={minifigs}
          submitting={saving}
          onSubmit={create}
        />
      </DrawerShell>

      <SetDetailDrawer
        open={detailOpen}
        selected={selected}
        themes={themes}
        catalogItems={catalogItems}
        partColors={partColors}
        minifigs={minifigs}
        saving={saving}
        setSaving={setSaving}
        err={err}
        setErr={setErr}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
          setErr(null);
        }}
        onPatched={(item) => {
          applyPatched(item);
          api
            .get(ENDPOINTS.catalog)
            .then((res) => setCatalogItems(getListData<CatalogItemMini>(res.data)))
            .catch(() => {});
        }}
        onDeleted={() => {
          setDetailOpen(false);
          setSelected(null);
          loadSets().catch(() => {});
        }}
      />
    </div>
  );
}
