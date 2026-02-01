import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import { PartColorForm, Part, Color, PartColorRow } from "../form/PartColorForm";
import "../admin-ui.css";

/** ---------------- helpers ---------------- */

function getListData<T = any>(resData: any): T[] {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData as T[];
  if (Array.isArray((resData as any).results)) return (resData as any).results as T[];
  return [];
}

function formatApiError(e: any): string {
  const data = e?.response?.data;
  if (!data) return e?.message ?? "Request failed";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  return "Request failed";
}

function safeHex(hex?: string | null) {
  if (!hex) return null;
  const h = String(hex).trim();
  if (!h) return null;
  return h.startsWith("#") ? h : `#${h}`;
}

/** ---------------- Drawer shell ---------------- */

function DrawerShell({
  open,
  title,
  onClose,
  children,
  width = 780,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  if (!open) return null;

  return (
    <div
      className="adminOverlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="adminDrawer" style={{ width: `min(${width}px, 100%)` }}>
        <div className="adminDrawerHeader">
          <div className="adminDrawerTitle">{title}</div>
          <button type="button" className="adminCloseBtn" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** ---------------- thumbs ---------------- */

function RowThumb({ src }: { src?: string | null }) {
  return (
    <div className="adminThumb">
      {src ? (
        <img
          src={src}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 900 }}>—</span>
      )}
    </div>
  );
}

function MiniThumb({ src }: { src?: string | null }) {
  return (
    <div className="adminMiniThumb">
      {src ? (
        <img
          src={src}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span style={{ fontSize: 9, color: "#cbd5e1", fontWeight: 900 }}>•</span>
      )}
    </div>
  );
}

/** ---------------- Detail drawer ---------------- */

function PartColorDetailDrawer({
  open,
  selected,
  allItems,
  colors,
  parts,
  saving,
  err,
  editing,
  onClose,
  onToggleEdit,
  onDelete,
  onSubmitEdit,
  onSelect,
}: {
  open: boolean;
  selected: PartColorRow | null;
  allItems: PartColorRow[];
  parts: Part[];
  colors: Color[];
  saving: boolean;
  err: string | null;
  editing: boolean;
  onClose: () => void;
  onToggleEdit: () => void;
  onDelete: () => void;
  onSubmitEdit: (payload: any) => void;
  onSelect: (pc: PartColorRow) => void;
}) {
  const partPk = selected?.part?.id;

  const siblings = useMemo(() => {
    if (!partPk) return [];
    return allItems.filter((x) => x.part?.id === partPk);
  }, [allItems, partPk]);

  const swatches = useMemo(() => {
    const map = new Map<
      number,
      { colorId: number; name: string; hex: string | null; row: PartColorRow; count: number }
    >();

    const score = (r: PartColorRow) => {
      let s = 0;
      if (r.thumb_url || r.image_url_1 || r.image_url_2) s += 10;
      if (!r.variant) s += 2;
      if (r.part_color_code) s += 1;
      return s;
    };

    for (const row of siblings) {
      const c = row.color;
      if (!c?.id) continue;

      const fromRow = safeHex((c as any).hex ?? null);
      const fromLookup = safeHex(colors.find((x) => x.id === c.id)?.hex ?? null);
      const cHex = fromRow ?? fromLookup ?? null;

      const existing = map.get(c.id);
      if (!existing) {
        map.set(c.id, { colorId: c.id, name: c.name ?? "—", hex: cHex, row, count: 1 });
        continue;
      }

      existing.count += 1;
      if (score(row) > score(existing.row)) {
        map.set(c.id, { ...existing, row, hex: existing.hex ?? cHex });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [siblings, colors]);

  const heroSrc = selected?.image_url_1 || selected?.thumb_url || selected?.image_url_2 || null;

  return (
    <DrawerShell
      open={open}
      title={selected?.part ? `${selected.part.part_id} — ${selected.part.name}` : "PartColor"}
      onClose={onClose}
      width={900}
    >
      {!selected ? (
        <div className="adminEmpty">No selection.</div>
      ) : (
        <div className="adminStack">
          {err ? <div className="adminErr">{err}</div> : null}

          <div className="adminDetailGrid">
            <div className="adminHero">
              {heroSrc ? (
                <img
                  src={heroSrc}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 900 }}>No image</div>
              )}
            </div>

            <div className="adminFormCard">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <RowThumb src={selected.thumb_url || selected.image_url_1 || selected.image_url_2 || null} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 950, color: "var(--text)" }}>
                    {selected.color?.name ?? "—"}
                    {selected.variant ? (
                      <span className="adminPcNameMuted"> • {selected.variant}</span>
                    ) : null}
                  </div>

                  <div style={{ fontSize: 12, color: "var(--muted2)", fontWeight: 900 }}>
                    <span style={{ color: "var(--text)" }}>
                      {selected.part?.part_id ?? "—"}
                    </span>{" "}
                    — {selected.part?.name ?? "—"}
                  </div>
                </div>
              </div>

              <div style={{ border: "1px solid rgba(15,23,42,.06)", borderRadius: 12, padding: 10, background: "#fafafa" }}>
                <div style={{ fontSize: 11, color: "var(--muted2)", fontWeight: 950 }}>Your PartColor ID</div>
                <div style={{ fontSize: 13, fontWeight: 950, color: "var(--text)" }}>
                  {selected.part_color_code ?? "—"}
                </div>
              </div>

              {selected.image_url_1 || selected.image_url_2 ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {selected.image_url_1 ? (
                    <a href={selected.image_url_1} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 950, color: "#2563eb", textDecoration: "none" }}>
                      Open image 1
                    </a>
                  ) : null}
                  {selected.image_url_2 ? (
                    <a href={selected.image_url_2} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 950, color: "#2563eb", textDecoration: "none" }}>
                      Open image 2
                    </a>
                  ) : null}
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="adminBtn adminBtnPrimary"
                  onClick={onToggleEdit}
                  disabled={saving}
                  style={{ opacity: saving ? 0.6 : 1 }}
                >
                  {editing ? "Stop editing" : "Edit"}
                </button>

                <button
                  type="button"
                  className="adminBtn"
                  onClick={onDelete}
                  disabled={saving}
                  style={{
                    opacity: saving ? 0.6 : 1,
                    borderColor: "#fecaca",
                    background: "#fee2e2",
                    color: "#991b1b",
                  }}
                >
                  Delete
                </button>

                <div className="adminCountText" style={{ alignSelf: "center" }}>
                  {siblings.length} variants for this shape
                </div>
              </div>
            </div>
          </div>

          {swatches.length > 0 ? (
            <div className="adminSwitchCard">
              <div className="adminSwitchLabel">Switch color</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {swatches.map((s) => {
                  const active = selected.color?.id === s.colorId;
                  return (
                    <button
                      key={s.colorId}
                      type="button"
                      className={active ? "adminSwatchBtn adminSwatchBtnActive" : "adminSwatchBtn"}
                      onClick={() => onSelect(s.row)}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 5,
                          background: s.hex ?? "#e5e7eb",
                          border: "1px solid rgba(0,0,0,.12)",
                        }}
                      />
                      <span style={{ whiteSpace: "nowrap" }}>{s.name}</span>
                      {s.count > 1 ? (
                        <span style={{ fontSize: 11, opacity: 0.85, marginLeft: 2 }}>
                          +{s.count - 1}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {editing ? (
            <div className="adminFormCard">
              <div className="adminLabel" style={{ marginBottom: 10 }}>
                Edit this PartColor
              </div>
              <PartColorForm
                parts={parts}
                colors={colors}
                submitting={saving}
                initialValues={selected}
                onSubmit={onSubmitEdit}
              />
            </div>
          ) : null}
        </div>
      )}
    </DrawerShell>
  );
}

/** ---------------- Page ---------------- */

type Group = { part: Part; rows: PartColorRow[] };

export default function PartColorsPage() {
  const [items, setItems] = useState<PartColorRow[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [q, setQ] = useState("");

  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<PartColorRow | null>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadAll() {
    setErr(null);
    const [pcRes, pRes, cRes] = await Promise.all([
      api.get(ENDPOINTS.partColors),
      api.get(ENDPOINTS.parts),
      api.get(ENDPOINTS.colors),
    ]);

    setItems(getListData<PartColorRow>(pcRes.data));
    setParts(getListData<Part>(pRes.data));
    setColors(getListData<Color>(cRes.data));
  }

  useEffect(() => {
    loadAll().catch((e) => setErr(formatApiError(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped: Group[] = useMemo(() => {
    const map = new Map<number, Group>();

    for (const pc of items) {
      const key = pc.part?.id;
      if (!key || !pc.part) continue;
      if (!map.has(key)) map.set(key, { part: pc.part, rows: [] });
      map.get(key)!.rows.push(pc);
    }

    for (const g of map.values()) {
      g.rows.sort((a, b) => {
        const ac = (a.part_color_code ?? "").toLowerCase();
        const bc = (b.part_color_code ?? "").toLowerCase();
        if (ac !== bc) return ac.localeCompare(bc);

        const an = (a.color?.name ?? "").toLowerCase();
        const bn = (b.color?.name ?? "").toLowerCase();
        if (an !== bn) return an.localeCompare(bn);

        return (a.variant ?? "").localeCompare(b.variant ?? "");
      });
    }

    let arr = Array.from(map.values()).sort((a, b) =>
      (a.part.part_id ?? "").localeCompare(b.part.part_id ?? "")
    );

    const qq = q.trim().toLowerCase();
    if (qq) {
      arr = arr
        .map((g) => {
          const partHit = `${g.part.part_id ?? ""} ${g.part.name ?? ""}`.toLowerCase().includes(qq);

          const rows = partHit
            ? g.rows
            : g.rows.filter((pc) =>
                `${pc.part_color_code ?? ""} ${pc.color?.name ?? ""} ${pc.variant ?? ""}`
                  .toLowerCase()
                  .includes(qq)
              );

          return { ...g, rows };
        })
        .filter((g) => g.rows.length > 0);
    }

    return arr;
  }, [items, q]);

  function toggle(partPk: number) {
    setExpanded((prev) => ({ ...prev, [partPk]: !prev[partPk] }));
  }

  function expandAll() {
    const all: Record<number, boolean> = {};
    grouped.forEach((g) => (all[g.part.id] = true));
    setExpanded(all);
  }

  function collapseAll() {
    setExpanded({});
  }

  function openDetail(pc: PartColorRow) {
    setSelected(pc);
    setDetailOpen(true);
    setEditing(false);
    setErr(null);
  }

  async function create(payload: any) {
    setSaving(true);
    setErr(null);
    try {
      await api.post(ENDPOINTS.partColors, payload);
      setCreateOpen(false);
      await loadAll();
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(payload: any) {
    if (!selected?.id) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await api.patch(`${ENDPOINTS.partColors}${selected.id}/`, payload);
      setSelected(res.data);
      setItems((prev) => prev.map((x) => (x.id === selected.id ? res.data : x)));
      setEditing(false);
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function removeSelected() {
    if (!selected?.id) return;
    if (!confirm("Delete this PartColor?")) return;
    setSaving(true);
    setErr(null);
    try {
      await api.delete(`${ENDPOINTS.partColors}${selected.id}/`);
      setDetailOpen(false);
      setSelected(null);
      await loadAll();
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="adminPage">
      {/* top bar */}
      <div className="adminToolbar">
        <input
          className="adminInput adminSearch"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search shape, color, variant, or your ID..."
          autoComplete="off"
        />

        <button type="button" className="adminBtn adminBtnPrimary" onClick={() => setCreateOpen(true)}>
          + New PartColor
        </button>

        <button type="button" className="adminBtn" onClick={expandAll}>
          Expand all
        </button>

        <button type="button" className="adminBtn" onClick={collapseAll}>
          Collapse all
        </button>

        <div className="adminCountText">
          {grouped.length} shapes • {items.length} rows
        </div>
      </div>

      {err ? <div className="adminErr">{err}</div> : null}

      {/* grouped list */}
      <div className="adminListCard">
        {grouped.length === 0 ? (
          <div className="adminEmpty">No results.</div>
        ) : (
          grouped.map((g, idx) => {
            const isOpen = !!expanded[g.part.id];
            const thumbs = g.rows
              .map((r) => r.thumb_url || r.image_url_1 || r.image_url_2 || null)
              .filter(Boolean)
              .slice(0, 4) as string[];

            const showPlaceholders = Math.max(0, 4 - thumbs.length);

            return (
              <div key={g.part.id} className={idx === 0 ? "" : "adminRowTopBorder"}>
                <button type="button" className="adminGroupBtn" onClick={() => toggle(g.part.id)}>
                  <div className="adminChev">{isOpen ? "▾" : "▸"}</div>

                  <div style={{ minWidth: 0 }}>
                    <div className="adminGroupTitle" title={`${g.part.part_id} — ${g.part.name}`}>
                      {g.part.part_id} — {g.part.name}{" "}
                      <span className="adminGroupCount">({g.rows.length})</span>
                    </div>

                    <div className="adminPreviewRow">
                      {thumbs.map((t, i) => (
                        <MiniThumb key={`${g.part.id}-t-${i}`} src={t} />
                      ))}
                      {Array.from({ length: showPlaceholders }).map((_, i) => (
                        <MiniThumb key={`${g.part.id}-p-${i}`} src={null} />
                      ))}
                      <div className="adminPreviewLabel">{thumbs.length > 0 ? "preview" : "no images yet"}</div>
                    </div>
                  </div>

                  <div className="adminShowHide">{isOpen ? "hide" : "show"}</div>
                </button>

                {isOpen ? (
                  <div className="adminGroupBody">
                    {g.rows.map((pc, pcIdx) => {
                      const img = pc.thumb_url || pc.image_url_1 || pc.image_url_2 || null;
                      const idText = pc.part_color_code ? `ID: ${pc.part_color_code}` : "ID: —";
                      const nameText = pc.color?.name ?? "—";
                      const variantText = pc.variant ? `• ${pc.variant}` : "";

                      return (
                        <button
                          key={pc.id}
                          type="button"
                          className={`adminPcRowBtn ${pcIdx === 0 ? "" : "adminPcRowTopBorder"}`}
                          onClick={() => openDetail(pc)}
                        >
                          <RowThumb src={img} />

                          <div className="adminPcId" title={idText}>
                            {idText}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div className="adminPcName" title={`${nameText} ${variantText}`}>
                              {nameText} {pc.variant ? <span className="adminPcNameMuted">• {pc.variant}</span> : null}
                            </div>

                            {/* Mobile subline */}
                            <div className="adminPcSubline">
                              <span>{idText}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {/* create */}
      <DrawerShell open={createOpen} title="New PartColor" onClose={() => setCreateOpen(false)} width={780}>
        <PartColorForm parts={parts} colors={colors} submitting={saving} onSubmit={create} />
      </DrawerShell>

      {/* detail */}
      <PartColorDetailDrawer
        open={detailOpen}
        selected={selected}
        allItems={items}
        parts={parts}
        colors={colors}
        saving={saving}
        err={err}
        editing={editing}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
          setEditing(false);
          setErr(null);
        }}
        onToggleEdit={() => setEditing((v) => !v)}
        onDelete={removeSelected}
        onSubmitEdit={saveEdit}
        onSelect={(pc) => {
          setSelected(pc);
          setEditing(false);
          setErr(null);
        }}
      />
    </div>
  );
}
