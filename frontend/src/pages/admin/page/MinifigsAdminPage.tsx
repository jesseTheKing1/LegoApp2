import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";

import type { CatalogItemMini } from "../../../types/catalog";
import type { Minifig, MinifigPayload, Theme } from "../../../types/minifig";

import { DrawerShell } from "../components/DrawerShell";
import { RowThumb } from "../components/Thumbs";
import { getListData } from "../utils/list";
import { formatApiError } from "../utils/errors";
import { cx, card, btnPrimary, btnBase, inputBase } from "../utils/ui";

import { MinifigForm } from "../form/MinifigForm";
import { MinifigDetailDrawer } from "../components/MinifigDetailDrawer";

export default function MinifigsAdminPage() {
  const [items, setItems] = useState<Minifig[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItemMini[]>([]);

  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Minifig | null>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadAll() {
    setErr(null);
    const [mfRes, tRes, catRes] = await Promise.all([
      api.get(ENDPOINTS.minifigs),
      api.get(ENDPOINTS.themes),
      api.get(ENDPOINTS.catalog),
    ]);

    setItems(getListData<Minifig>(mfRes.data));
    setThemes(getListData<Theme>(tRes.data));
    setCatalogItems(getListData<CatalogItemMini>(catRes.data));
  }

  useEffect(() => {
    loadAll().catch((e) => setErr(formatApiError(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((m) => {
      const text = `${m.bricklink_id ?? ""} ${m.name ?? ""} ${m.theme?.name ?? ""}`.toLowerCase();
      return text.includes(qq);
    });
  }, [items, q]);

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
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <input
          className={cx(inputBase, "sm:max-w-md")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search BrickLink ID, name, or theme..."
          autoComplete="off"
        />

        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} onClick={() => setCreateOpen(true)}>
            + New Minifig
          </button>
          <button type="button" className={btnBase} onClick={() => loadAll().catch(() => {})}>
            Refresh
          </button>
        </div>

        <div className="text-xs text-slate-500 font-semibold sm:ml-auto">
          {filtered.length} minifigs
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      <div className={card}>
        {filtered.length === 0 ? (
          <div className="p-4 text-sm text-slate-600">No results.</div>
        ) : (
          filtered.map((mf, idx) => {
            const img = mf.image_url || null;
            const priceBadge =
              mf.catalog_item && mf.catalog_item.base_price_override != null
                ? `$${mf.catalog_item.base_price_override}`
                : null;

            return (
              <button
                key={mf.id}
                type="button"
                className={cx(
                  "w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50",
                  idx === 0 ? "" : "border-t border-slate-200"
                )}
                onClick={() => openDetail(mf)}
              >
                <RowThumb src={img} />

                <div className="hidden sm:block w-[220px] text-xs font-semibold text-slate-600 truncate">
                  {mf.bricklink_id}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold text-slate-900 truncate">
                    {mf.name}
                    {priceBadge ? (
                      <span className="ml-2 inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-extrabold text-slate-700">
                        {priceBadge}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-slate-500 font-semibold truncate">
                    {mf.theme?.name ?? "No theme"}
                  </div>
                </div>

                <div className="text-xs text-slate-500 font-semibold">open</div>
              </button>
            );
          })
        )}
      </div>

      <DrawerShell open={createOpen} title="New Minifig" onClose={() => setCreateOpen(false)} width={980}>
        <MinifigForm
          themes={themes}
          catalogItems={catalogItems}
          submitting={saving}
          onSubmit={create}
        />
      </DrawerShell>

      <MinifigDetailDrawer
        open={detailOpen}
        selected={selected}
        themes={themes}
        catalogItems={catalogItems}
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
          // refresh catalog list because SKU/price might change
          api.get(ENDPOINTS.catalog).then((res) => setCatalogItems(getListData<CatalogItemMini>(res.data))).catch(() => {});
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
