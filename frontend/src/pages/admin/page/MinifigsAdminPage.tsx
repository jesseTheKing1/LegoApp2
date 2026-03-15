import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";

import type { CatalogItemMini } from "../../../types/catalog";
import type { Minifig, MinifigPayload, Theme } from "../../../types/minifig";
import type { PartColor } from "../../../types/partColor";

import { DrawerShell } from "../components/DrawerShell";
import { getListData } from "../utils/list";
import { formatApiError } from "../utils/errors";
import { MinifigForm } from "../form/MinifigForm";
import { MinifigDetailDrawer } from "../components/MinifigDetailDrawer";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

const inputBase =
  "w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition " +
  "placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-200/70";

const shellCard =
  "rounded-[28px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]";

export default function MinifigsAdminPage() {
  const [partColors, setPartColors] = useState<PartColor[]>([]);
  const [items, setItems] = useState<Minifig[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItemMini[]>([]);

  const [q, setQ] = useState("");
  const [themeFilter, setThemeFilter] = useState<string>("");

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Minifig | null>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadAll() {
    setErr(null);
    const [mfRes, tRes, catRes, pcRes] = await Promise.all([
      api.get(ENDPOINTS.minifigs),
      api.get(ENDPOINTS.themes),
      api.get(ENDPOINTS.catalog),
      api.get(ENDPOINTS.partColors),
    ]);

    setItems(getListData<Minifig>(mfRes.data));
    setThemes(getListData<Theme>(tRes.data));
    setCatalogItems(getListData<CatalogItemMini>(catRes.data));
    setPartColors(getListData<PartColor>(pcRes.data));
  }

  useEffect(() => {
    loadAll().catch((e) => setErr(formatApiError(e)));
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return items.filter((m) => {
      const matchesSearch =
        !qq ||
        `${m.bricklink_id ?? ""} ${m.name ?? ""} ${m.theme?.name ?? ""}`
          .toLowerCase()
          .includes(qq);

      const matchesTheme =
        !themeFilter || String(m.theme?.id ?? "") === themeFilter;

      return matchesSearch && matchesTheme;
    });
  }, [items, q, themeFilter]);

  const stats = useMemo(() => {
    const withPrice = items.filter((x) => x.catalog_item?.base_price_override != null).length;
    const withIngredients = items.filter((x) => (x.ingredients?.length ?? 0) > 0).length;
    const withoutTheme = items.filter((x) => !x.theme?.id).length;
    return {
      total: items.length,
      withPrice,
      withIngredients,
      withoutTheme,
    };
  }, [items]);

  function openDetail(mf: Minifig) {
    setSelected(mf);
    setDetailOpen(true);
    setErr(null);
  }

  function applyPatched(mf: Minifig) {
    setSelected(mf);
    setItems((prev) => prev.map((x) => (x.id === mf.id ? mf : x)));
  }

  async function create(payload: MinifigPayload) {
    setSaving(true);
    setErr(null);
    try {
      await api.post(ENDPOINTS.minifigs, payload);
      setCreateOpen(false);
      await loadAll();
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Minifigs", value: stats.total },
          { label: "With pricing", value: stats.withPrice },
          { label: "With ingredients", value: stats.withIngredients },
          { label: "No theme", value: stats.withoutTheme },
        ].map((stat) => (
          <div key={stat.label} className={shellCard}>
            <div className="p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                {stat.label}
              </div>
              <div className="mt-1 text-2xl font-black text-slate-950">
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={shellCard}>
        <div className="border-b border-slate-200/80 px-5 py-4">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Minifigure admin
          </div>
          <div className="mt-1 text-lg font-black text-slate-950">
            Manage minifigures like premium assemblies
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <input
              className={cx(inputBase, "xl:max-w-md")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search BrickLink ID, name, or theme..."
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
                onClick={() => setCreateOpen(true)}
              >
                + New minifig
              </button>

              <button
                type="button"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50"
                onClick={() => loadAll().catch(() => {})}
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

          {filtered.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
              <div className="text-sm font-semibold text-slate-700">No results</div>
              <div className="mt-1 text-sm text-slate-500">
                Try another search or create a new minifigure.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((mf) => {
                const price =
                  mf.catalog_item?.base_price_override != null
                    ? `$${mf.catalog_item.base_price_override}`
                    : null;

                const ingredientCount = mf.ingredients?.length ?? 0;

                return (
                  <button
                    key={mf.id}
                    type="button"
                    onClick={() => openDetail(mf)}
                    className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white text-left shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]"
                  >
                    <div className="aspect-square bg-[radial-gradient(circle_at_top,#f8fafc,white_62%)] p-4">
                      {mf.image_url ? (
                        <img
                          src={mf.image_url}
                          alt=""
                          className="h-full w-full object-contain drop-shadow-[0_14px_30px_rgba(15,23,42,0.16)] transition group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="grid h-full place-items-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-base font-black text-slate-950">
                            {mf.name}
                          </div>
                          <div className="mt-1 truncate text-sm font-semibold text-slate-500">
                            {mf.bricklink_id}
                          </div>
                        </div>

                        {price ? (
                          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black text-slate-800">
                            {price}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700">
                          {mf.theme?.name || "No theme"}
                        </span>

                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700">
                          {ingredientCount} ingredients
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
        title="New Minifig"
        onClose={() => setCreateOpen(false)}
        width={1280}
      >
        <MinifigForm
          themes={themes}
          catalogItems={catalogItems}
          partColors={partColors}
          submitting={saving}
          onSubmit={create}
        />
      </DrawerShell>

      <MinifigDetailDrawer
        open={detailOpen}
        selected={selected}
        themes={themes}
        catalogItems={catalogItems}
        partColors={partColors}
        saving={saving}
        setSaving={setSaving}
        err={err}
        setErr={setErr}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
          setErr(null);
        }}
        onPatched={(mf) => {
          applyPatched(mf);
          api
            .get(ENDPOINTS.catalog)
            .then((res) => setCatalogItems(getListData<CatalogItemMini>(res.data)))
            .catch(() => {});
        }}
        onDeleted={() => {
          setDetailOpen(false);
          setSelected(null);
          loadAll().catch(() => {});
        }}
      />
    </div>
  );
}