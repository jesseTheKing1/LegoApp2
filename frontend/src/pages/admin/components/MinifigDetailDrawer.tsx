import React, { useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";

import type { CatalogItemMini } from "../../../types/catalog";
import type {
  Minifig,
  MinifigPayload,
  Theme,
} from "../../../types/minifig";
import type { PartColor } from "../../../types/partColor";

import { DrawerShell } from "../components/DrawerShell";
import { formatApiError } from "../utils/errors";
import { MinifigForm } from "../form/MinifigForm";

const statCard =
  "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3";

export function MinifigDetailDrawer({
  open,
  selected,
  themes,
  catalogItems,
  partColors,
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
  partColors: PartColor[];
  saving: boolean;
  setSaving: (v: boolean) => void;
  err: string | null;
  setErr: (v: string | null) => void;
  onClose: () => void;
  onPatched: (mf: Minifig) => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);

  React.useEffect(() => {
    if (!open) return;
    setEditing(false);
  }, [open, selected?.id]);

  const stats = useMemo(() => {
    const count = selected?.ingredients?.length ?? 0;
    const requiredCount = selected?.ingredients?.filter((x) => x.is_required).length ?? 0;
    const rolesCount = new Set((selected?.ingredients ?? []).map((x) => x.role)).size;
    return { count, requiredCount, rolesCount };
  }, [selected]);

  async function save(payload: MinifigPayload) {
    if (!selected?.id) return;
    setSaving(true);
    setErr(null);

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
    if (!confirm("Delete this minifigure?")) return;

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
    <DrawerShell open={open} title={title} onClose={onClose} width={1220}>
      {err ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {!selected ? (
        <div className="text-sm text-slate-600">No selection.</div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Minifigure overview
                  </div>
                  <div className="mt-1 text-lg font-black text-slate-950">
                    Product and assembly summary
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50"
                    onClick={() => setEditing((v) => !v)}
                    disabled={saving}
                  >
                    {editing ? "Cancel editing" : "Edit minifigure"}
                  </button>

                  <button
                    type="button"
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100"
                    onClick={remove}
                    disabled={saving}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className={statCard}>
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Theme
                  </div>
                  <div className="mt-1 text-sm font-black text-slate-950">
                    {selected.theme?.name || "None"}
                  </div>
                </div>

                <div className={statCard}>
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Ingredients
                  </div>
                  <div className="mt-1 text-sm font-black text-slate-950">
                    {stats.count}
                  </div>
                </div>

                <div className={statCard}>
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Required
                  </div>
                  <div className="mt-1 text-sm font-black text-slate-950">
                    {stats.requiredCount}
                  </div>
                </div>

                <div className={statCard}>
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Roles
                  </div>
                  <div className="mt-1 text-sm font-black text-slate-950">
                    {stats.rolesCount}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {editing ? (
            <MinifigForm
              themes={themes}
              catalogItems={catalogItems}
              partColors={partColors}
              initialValues={selected}
              submitting={saving}
              onSubmit={save}
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.7fr_1.3fr]">
              <div className="space-y-5">
                <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                  <div className="aspect-square bg-[radial-gradient(circle_at_top,#f8fafc,white_62%)] p-5">
                    {selected.image_url ? (
                      <img
                        src={selected.image_url}
                        alt=""
                        className="h-full w-full object-contain drop-shadow-[0_14px_30px_rgba(15,23,42,0.18)]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-400">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 bg-white px-5 py-5">
                    <div className="text-xl font-black text-slate-950">
                      {selected.name}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-500">
                      {selected.bricklink_id}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                        {selected.theme?.name || "No theme"}
                      </span>

                      {selected.catalog_item?.base_price_override != null ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                          ${selected.catalog_item.base_price_override}
                        </span>
                      ) : null}

                      {selected.catalog_item?.sku ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                          {selected.catalog_item.sku}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Ingredients
                    </div>
                    <div className="mt-1 text-lg font-black text-slate-950">
                      Assembly breakdown
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    {!selected.ingredients || selected.ingredients.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                        <div className="text-sm font-semibold text-slate-700">
                          No ingredients yet
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selected.ingredients.map((row, idx) => {
                          const image =
                            row.part_color.image_url_1 ||
                            row.part_color.image_url_2 ||
                            row.part_color.part?.image_url ||
                            "";

                          return (
                            <div
                              key={row.id ?? idx}
                              className="flex items-center gap-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-3 sm:p-4"
                            >
                              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                {image ? (
                                  <img
                                    src={image}
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
                                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-700">
                                    {row.role}
                                  </span>

                                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-slate-700">
                                    Qty {row.quantity}
                                  </span>

                                  {!row.is_required ? (
                                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700">
                                      Optional
                                    </span>
                                  ) : null}
                                </div>

                                <div className="mt-2 truncate text-sm font-black text-slate-950">
                                  {row.part_color.part?.name || "Unnamed part"}
                                </div>
                                <div className="mt-1 truncate text-xs font-semibold text-slate-500">
                                  {row.part_color.part?.part_id} • {row.part_color.color?.name}
                                  {row.part_color.variant ? ` • ${row.part_color.variant}` : ""}
                                </div>

                                {row.notes ? (
                                  <div className="mt-2 text-xs font-medium text-slate-600">
                                    {row.notes}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DrawerShell>
  );
}