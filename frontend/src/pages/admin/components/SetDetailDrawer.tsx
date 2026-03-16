import React from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";

import type { CatalogItemMini } from "../../../types/catalog";
import type { Theme, Minifig } from "../../../types/minifig";
import type { PartColor } from "../../../types/partColor";
import type { LegoSet, SetPayload } from "../../../types/set";

import { DrawerShell } from "./DrawerShell";
import { SetForm } from "../form/SetForm";
import { formatApiError } from "../utils/errors";

export function SetDetailDrawer({
  open,
  selected,
  themes,
  catalogItems,
  partColors,
  minifigs,
  saving,
  setSaving,
  err,
  setErr,
  onClose,
  onPatched,
  onDeleted,
}: {
  open: boolean;
  selected: LegoSet | null;
  themes: Theme[];
  catalogItems: CatalogItemMini[];
  partColors: PartColor[];
  minifigs: Minifig[];
  saving: boolean;
  setSaving: (v: boolean) => void;
  err: string | null;
  setErr: (v: string | null) => void;
  onClose: () => void;
  onPatched: (item: LegoSet) => void;
  onDeleted: () => void;
}) {
  if (!selected) return null;
  const setItem = selected;

  async function submit(payload: SetPayload) {
    setSaving(true);
    setErr(null);
    try {
      const res = await api.patch(`${ENDPOINTS.sets}${setItem.id}/`, payload);
      onPatched(res.data as LegoSet);
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const ok = window.confirm(`Delete set "${setItem.name}"?`);
    if (!ok) return;

    setSaving(true);
    setErr(null);
    try {
      await api.delete(`${ENDPOINTS.sets}${setItem.id}/`);
      onDeleted();
    } catch (e) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DrawerShell
      open={open}
      title={`Edit Set — ${setItem.set_num}`}
      onClose={onClose}
      width={1440}
    >
      <div className="space-y-4">
        {err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={remove}
            disabled={saving}
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Delete set
          </button>
        </div>

        <SetForm
          themes={themes}
          catalogItems={catalogItems}
          partColors={partColors}
          minifigs={minifigs}
          initialValues={setItem}
          submitting={saving}
          onSubmit={submit}
        />
      </div>
    </DrawerShell>
  );
}