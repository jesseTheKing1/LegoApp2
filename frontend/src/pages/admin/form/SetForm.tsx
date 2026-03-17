import React, { useMemo, useState } from "react";
import type { CatalogItemMini } from "../../../types/catalog";
import type { Theme, Minifig } from "../../../types/minifig";
import type { PartColor } from "../../../types/partColor";
import type {
  LegoSet,
  SetPayload,
  SetPartPayload,
  SetMinifigPayload,
} from "../../../types/set";

import { PartColorSearchPicker } from "../components/PartColorSearchPicker";

export function SetForm({
  themes,
  catalogItems,
  minifigs,
  initialValues,
  submitting,
  onSubmit,
}: {
  themes: Theme[];
  catalogItems: CatalogItemMini[];
  minifigs: Minifig[];
  initialValues?: Partial<LegoSet>;
  submitting?: boolean;
  onSubmit: (payload: SetPayload) => Promise<void> | void;
}) {
  const [setNum, setSetNum] = useState(initialValues?.set_num ?? "");
  const [name, setName] = useState(initialValues?.name ?? "");
  const [imageUrl, setImageUrl] = useState(initialValues?.image_url ?? "");
  const [pieceCount, setPieceCount] = useState(
    initialValues?.official_piece_count ?? 0
  );

  const [themeId, setThemeId] = useState<number | "">(
    initialValues?.theme?.id ?? ""
  );

  const [catalogId, setCatalogId] = useState<number | "">(
    initialValues?.catalog_item?.id ?? ""
  );

  const [parts, setParts] = useState<SetPartPayload[]>(
    (initialValues?.parts ?? []).map((row, i) => ({
      part_color_id: row.part_color.id,
      quantity: row.quantity,
      instruction_page: row.instruction_page,
      sort_order: row.sort_order ?? i,
      bag_number: row.bag_number ?? "",
      is_visible: row.is_visible,
      is_structural: row.is_structural,
      notes: row.notes ?? "",
    }))
  );

  const [minifigsState, setMinifigs] = useState<SetMinifigPayload[]>(
    (initialValues?.minifigs ?? []).map((row, i) => ({
      minifig_id: row.minifig.id,
      quantity: row.quantity,
      sort_order: row.sort_order ?? i,
      bag_number: row.bag_number ?? "",
      notes: row.notes ?? "",
    }))
  );

  const canSave = useMemo(() => {
    return !!setNum.trim() && !!name.trim() && !submitting;
  }, [setNum, name, submitting]);

  // ---------- PARTS ----------

  function addPart() {
    setParts((prev) => [
      ...prev,
      {
        part_color_id: 0,
        quantity: 1,
        instruction_page: null,
        sort_order: prev.length,
        bag_number: "",
        is_visible: true,
        is_structural: false,
        notes: "",
      },
    ]);
  }

  function updatePart(i: number, patch: Partial<SetPartPayload>) {
    setParts((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row))
    );
  }

  function removePart(i: number) {
    setParts((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ---------- MINIFIGS ----------

  function addMinifig() {
    setMinifigs((prev) => [
      ...prev,
      {
        minifig_id: 0,
        quantity: 1,
        sort_order: prev.length,
        bag_number: "",
        notes: "",
      },
    ]);
  }

  function updateMinifig(i: number, patch: Partial<SetMinifigPayload>) {
    setMinifigs((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row))
    );
  }

  function removeMinifig(i: number) {
    setMinifigs((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ---------- SUBMIT ----------

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const payload: SetPayload = {
      set_num: setNum.trim(),
      name: name.trim(),
      image_url: imageUrl || undefined,
      official_piece_count: pieceCount,
      theme_id: themeId || null,
      catalog_item_id: catalogId || null,

      parts: parts
        .filter((p) => p.part_color_id)
        .map((p, i) => ({
          ...p,
          sort_order: i,
        })),

      minifigs: minifigsState
        .filter((m) => m.minifig_id)
        .map((m, i) => ({
          ...m,
          sort_order: i,
        })),
    };

    await onSubmit(payload);
  }

  // ---------- UI ----------

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* BASIC INFO */}
      <div>
        <input
          value={setNum}
          onChange={(e) => setSetNum(e.target.value)}
          placeholder="Set Number"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Set Name"
        />
        <input
          type="number"
          value={pieceCount}
          onChange={(e) => setPieceCount(Number(e.target.value))}
          placeholder="Piece Count"
        />
      </div>

      {/* PARTS */}
      <div>
        <h3>Parts</h3>
        <button type="button" onClick={addPart}>
          + Add Part
        </button>

        {parts.map((row, i) => (
          <div key={i}>
            <PartColorSearchPicker
              value={row.part_color_id}
              onChange={(id) => updatePart(i, { part_color_id: id })}
            />

            <input
              type="number"
              value={row.quantity}
              onChange={(e) =>
                updatePart(i, { quantity: Number(e.target.value) })
              }
            />

            <input
              placeholder="Bag"
              value={row.bag_number}
              onChange={(e) =>
                updatePart(i, { bag_number: e.target.value })
              }
            />

            <label>
              Visible
              <input
                type="checkbox"
                checked={row.is_visible}
                onChange={(e) =>
                  updatePart(i, { is_visible: e.target.checked })
                }
              />
            </label>

            <label>
              Structural
              <input
                type="checkbox"
                checked={row.is_structural}
                onChange={(e) =>
                  updatePart(i, { is_structural: e.target.checked })
                }
              />
            </label>

            <button onClick={() => removePart(i)}>Remove</button>
          </div>
        ))}
      </div>

      {/* MINIFIGS */}
      <div>
        <h3>Minifigs</h3>
        <button type="button" onClick={addMinifig}>
          + Add Minifig
        </button>

        {minifigsState.map((row, i) => (
          <div key={i}>
            <select
              value={row.minifig_id}
              onChange={(e) =>
                updateMinifig(i, { minifig_id: Number(e.target.value) })
              }
            >
              <option value="">Select</option>
              {minifigs.map((mf) => (
                <option key={mf.id} value={mf.id}>
                  {mf.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={row.quantity}
              onChange={(e) =>
                updateMinifig(i, { quantity: Number(e.target.value) })
              }
            />

            <input
              placeholder="Bag"
              value={row.bag_number}
              onChange={(e) =>
                updateMinifig(i, { bag_number: e.target.value })
              }
            />

            <button onClick={() => removeMinifig(i)}>Remove</button>
          </div>
        ))}
      </div>

      <button disabled={!canSave}>
        {submitting ? "Saving..." : "Save Set"}
      </button>
    </form>
  );
}