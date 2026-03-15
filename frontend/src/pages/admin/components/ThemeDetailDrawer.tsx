import React, { useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import type { Theme } from "../../../types/minifig";
import { DrawerShell } from "../components/DrawerShell";
import { formatApiError } from "../utils/errors";
import { ThemeForm, type ThemePayload } from "../form/ThemeForm";

export function ThemeDetailDrawer({
  open,
  selected,
  saving,
  setSaving,
  err,
  setErr,
  onClose,
  onPatched,
  onDeleted,
}: {
  open: boolean;
  selected: Theme | null;
  saving: boolean;
  setSaving: (v: boolean) => void;
  err: string | null;
  setErr: (v: string | null) => void;
  onClose: () => void;
  onPatched: (theme: Theme) => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);

  React.useEffect(() => {
    if (!open) return;
    setEditing(false);
  }, [open, selected?.id]);

  async function save(payload: ThemePayload) {
    if (!selected?.id) return;
    setSaving(true);
    setErr(null);

    try {
      const res = await api.patch(`${ENDPOINTS.themes}${selected.id}/`, payload);
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
    if (!confirm("Delete this theme?")) return;

    setSaving(true);
    setErr(null);

    try {
      await api.delete(`${ENDPOINTS.themes}${selected.id}/`);
      onDeleted();
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  const title = selected ? selected.name : "Theme";

  return (
    <DrawerShell open={open} title={title} onClose={onClose} width={1180}>
      {err ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {!selected ? (
        <div className="text-sm text-slate-600">No selection.</div>
      ) : editing ? (
        <ThemeForm initialValues={selected} submitting={saving} onSubmit={save} />
      ) : (
        <div className="space-y-5">
          <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Theme overview
                  </div>
                  <div className="mt-1 text-lg font-black text-slate-950">
                    Theme details
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50"
                    onClick={() => setEditing(true)}
                    disabled={saving}
                  >
                    Edit theme
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
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.8fr_1.2fr]">
                <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
                  <div className="aspect-[4/3] bg-[radial-gradient(circle_at_top,#f8fafc,white_62%)] p-4">
                    {selected.image_url ? (
                      <img
                        src={selected.image_url}
                        alt=""
                        className="h-full w-full object-cover rounded-[20px]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-400">
                        No image
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Theme name
                    </div>
                    <div className="mt-1 text-xl font-black text-slate-950">
                      {selected.name}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Image URL
                    </div>
                    <div className="mt-1 break-all text-sm font-semibold text-slate-700">
                      {selected.image_url || "No image set"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DrawerShell>
  );
}