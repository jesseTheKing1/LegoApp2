import React, { useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";

import type { CatalogItemMini } from "../../../types/catalog";
import type { Minifig, MinifigPayload, Theme } from "../../../types/minifig";

import { DrawerShell } from "../components/DrawerShell";
import { formatApiError } from "../utils/errors";

const inputBase =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none " +
  "focus:ring-2 focus:ring-slate-200 focus:border-slate-300";

const selectBase =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none " +
  "focus:ring-2 focus:ring-slate-200 focus:border-slate-300";

export function MinifigDetailDrawer({
  open,
  selected,
  themes,
  catalogItems,
  saving,
  setSaving,
  err,
  setErr,
  onClose,
  onPatched,
  onDeleted,
}: {
  open: boolean;
  selected: Minifig | null;
  themes: Theme[];
  catalogItems: CatalogItemMini[];

  saving: boolean;
  setSaving: (v: boolean) => void;

  err: string | null;
  setErr: (v: string | null) => void;

  onClose: () => void;
  onPatched: (mf: Minifig) => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);

  const [themeId, setThemeId] = useState<number | "">("");
  const [bricklinkId, setBricklinkId] = useState("");
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [catalogId, setCatalogId] = useState<number | "">("");
  const [basePrice, setBasePrice] = useState<string>("");

  // keep local state in sync when selection changes
  React.useEffect(() => {
    if (!selected) return;
    setThemeId(selected.theme?.id ?? "");
    setBricklinkId(selected.bricklink_id ?? "");
    setName(selected.name ?? "");
    setImageUrl(selected.image_url ?? "");

    setCatalogId(selected.catalog_item?.id ?? "");
    setBasePrice(
      selected.catalog_item?.base_price_override != null
        ? String(selected.catalog_item.base_price_override)
        : ""
    );

    setEditing(false);
  }, [selected, open]);

  const canSave = useMemo(() => {
    return (
      !!selected?.id &&
      !!themeId &&
      !!bricklinkId.trim() &&
      !!name.trim() &&
      !saving
    );
  }, [selected, themeId, bricklinkId, name, saving]);

  async function save() {
    if (!selected?.id) return;
    setSaving(true);
    setErr(null);

    const payload: MinifigPayload = {
      theme_id: Number(themeId),
      bricklink_id: bricklinkId.trim(),
      name: name.trim(),
      image_url: imageUrl.trim() || undefined,
      catalog_item_id: catalogId === "" ? null : Number(catalogId),
    };

    if (basePrice.trim() !== "") payload.base_price_override = basePrice.trim();

    try {
      const res = await api.patch(`${ENDPOINTS.minifigs}${selected.id}/`, payload);
      onPatched(res.data);
      setEditing(false);
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!selected?.id) return;
    if (!confirm("Delete this Minifig?")) return;

    setSaving(true);
    setErr(null);
    try {
      await api.delete(`${ENDPOINTS.minifigs}${selected.id}/`);
      onDeleted();
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  const title = selected ? `${selected.bricklink_id} — ${selected.name}` : "Minifig";

  return (
    <DrawerShell open={open} title={title} onClose={onClose} width={980}>
      {err ? (
        <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {!selected ? (
        <div className="text-sm text-slate-600">No selection.</div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
              onClick={() => setEditing((v) => !v)}
              disabled={saving}
            >
              {editing ? "Stop editing" : "Edit"}
            </button>

            <button
              type="button"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
              onClick={remove}
              disabled={saving}
            >
              Delete
            </button>
          </div>

          {/* preview */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px,1fr]">
              <div className="aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <div className="h-full w-full grid place-items-center text-xs text-slate-500">
                    No image
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <div className="text-xs font-semibold text-slate-600">Theme</div>
                    <select
                      className={selectBase}
                      value={themeId}
                      disabled={!editing}
                      onChange={(e) => setThemeId(e.target.value ? Number(e.target.value) : "")}
                    >
                      <option value="">Select theme…</option>
                      {themes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <div className="text-xs font-semibold text-slate-600">BrickLink ID</div>
                    <input
                      className={inputBase}
                      value={bricklinkId}
                      disabled={!editing}
                      onChange={(e) => setBricklinkId(e.target.value)}
                    />
                  </label>
                </div>

                <label className="space-y-1">
                  <div className="text-xs font-semibold text-slate-600">Name</div>
                  <input
                    className={inputBase}
                    value={name}
                    disabled={!editing}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>

                <label className="space-y-1">
                  <div className="text-xs font-semibold text-slate-600">Image URL</div>
                  <input
                    className={inputBase}
                    value={imageUrl}
                    disabled={!editing}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </label>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                    Pricing (CatalogItem)
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="space-y-1">
                      <div className="text-xs font-semibold text-slate-600">Attach CatalogItem</div>
                      <select
                        className={selectBase}
                        value={catalogId}
                        disabled={!editing}
                        onChange={(e) => setCatalogId(e.target.value ? Number(e.target.value) : "")}
                      >
                        <option value="">None</option>
                        {catalogItems.map((ci) => (
                          <option key={ci.id} value={ci.id}>
                            {ci.sku}
                            {ci.base_price_override != null ? ` — $${ci.base_price_override}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1">
                      <div className="text-xs font-semibold text-slate-600">Base price override</div>
                      <input
                        className={inputBase}
                        value={basePrice}
                        disabled={!editing}
                        onChange={(e) => setBasePrice(e.target.value)}
                        placeholder="4.50"
                        inputMode="decimal"
                      />
                    </label>
                  </div>

                  <div className="mt-2 text-[11px] font-semibold text-slate-600">
                    Tip: If a CatalogItem is attached and you set a price, the backend will update the CatalogItem price.
                  </div>
                </div>

                {editing ? (
                  <button
                    type="button"
                    disabled={!canSave}
                    onClick={save}
                    className={[
                      "rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm",
                      "bg-slate-900 hover:bg-slate-800 active:bg-slate-950",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                    ].join(" ")}
                  >
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </DrawerShell>
  );
}
