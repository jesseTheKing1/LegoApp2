import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import { PartColorForm, Part, Color, PartColorRow } from "../form/PartColorForm";

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

/** merge style objects safely */
function sx(...styles: Array<React.CSSProperties | false | null | undefined>) {
  return Object.assign({}, ...styles.filter(Boolean));
}

/** ---------------- UI bits ---------------- */

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
      style={S.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={sx(S.drawer, { width: `min(${width}px, 100%)` })}>
        <div style={S.drawerHeader}>
          <div style={S.drawerTitle}>{title}</div>
          <button onClick={onClose} style={S.ghostBtn} type="button">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function RowThumb({ src }: { src?: string | null }) {
  return (
    <div style={S.thumb}>
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
        <span style={{ fontSize: 10, color: "#9ca3af" }}>—</span>
      )}
    </div>
  );
}

function MiniThumb({ src }: { src?: string | null }) {
  return (
    <div style={S.miniThumb}>
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
        <span style={{ fontSize: 9, color: "#cbd5e1" }}>•</span>
      )}
    </div>
  );
}

function PillButton({
  children,
  onClick,
  tone = "white",
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "white" | "dark" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base: React.CSSProperties = {
    borderRadius: 10,
    padding: "8px 10px",
    fontWeight: 850,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    border: "1px solid #e5e7eb",
    background: "white",
    color: "#111827",
  };

  const styles: Record<string, React.CSSProperties> = {
    white: base,
    dark: { ...base, background: "#111827", color: "white", border: "1px solid #111827" },
    danger: { ...base, background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca" },
  };

  return (
    <button type={type} onClick={disabled ? undefined : onClick} style={styles[tone]} disabled={disabled}>
      {children}
    </button>
  );
}

/** ---------------- Detail Drawer ---------------- */

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
        <div style={{ padding: 12, color: "#6b7280", fontSize: 12 }}>No selection.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {err ? <div style={S.errBox}>{err}</div> : null}

          <div style={S.detailGrid}>
            <div style={S.hero}>
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
                <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 800 }}>No image</div>
              )}
            </div>

            <div style={S.detailCard}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <RowThumb src={selected.thumb_url || selected.image_url_1 || selected.image_url_2 || null} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 950, color: "#111827" }}>
                    {selected.color?.name ?? "—"}
                    {selected.variant ? (
                      <span style={{ color: "#6b7280", fontWeight: 900 }}> • {selected.variant}</span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    <span style={{ fontWeight: 900, color: "#111827" }}>{selected.part?.part_id}</span> —{" "}
                    {selected.part?.name}
                  </div>
                </div>
              </div>

              <div style={S.idBox}>
                <div style={S.idLabel}>Your PartColor ID</div>
                <div style={S.idValue}>{selected.part_color_code ?? "—"}</div>
              </div>

              {(selected.image_url_1 || selected.image_url_2) ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {selected.image_url_1 ? (
                    <a
                      href={selected.image_url_1}
                      target="_blank"
                      rel="noreferrer"
                      style={S.link}
                    >
                      Open image 1
                    </a>
                  ) : null}
                  {selected.image_url_2 ? (
                    <a
                      href={selected.image_url_2}
                      target="_blank"
                      rel="noreferrer"
                      style={S.link}
                    >
                      Open image 2
                    </a>
                  ) : null}
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <PillButton onClick={onToggleEdit} disabled={saving} tone="dark">
                  {editing ? "Stop editing" : "Edit"}
                </PillButton>
                <PillButton onClick={onDelete} disabled={saving} tone="danger">
                  Delete
                </PillButton>
                <div style={{ fontSize: 12, color: "#6b7280", alignSelf: "center" }}>
                  {siblings.length} variants for this shape
                </div>
              </div>
            </div>
          </div>

          {swatches.length > 0 ? (
            <div style={S.switchCard}>
              <div style={S.switchLabel}>Switch color</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {swatches.map((s) => {
                  const active = selected.color?.id === s.colorId;
                  return (
                    <button
                      key={s.colorId}
                      type="button"
                      onClick={() => onSelect(s.row)}
                      style={sx(S.swatchBtn, active && S.swatchBtnActive)}
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
                        <span style={{ fontSize: 11, opacity: 0.8, marginLeft: 2 }}>
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
            <div style={S.editWrap}>
              <div style={{ fontSize: 12, fontWeight: 950, marginBottom: 10 }}>Edit this PartColor</div>
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
    <div style={{ display: "grid", gap: 10 }}>
      {/* top bar */}
      <div style={S.topbar}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search shape, color, variant, or your ID..."
          style={S.search}
        />
        <PillButton onClick={() => setCreateOpen(true)} tone="dark">
          + New PartColor
        </PillButton>
        <PillButton onClick={expandAll}>Expand all</PillButton>
        <PillButton onClick={collapseAll}>Collapse all</PillButton>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {grouped.length} shapes • {items.length} rows
        </div>
      </div>

      {err ? <div style={S.errBox}>{err}</div> : null}

      {/* grouped list */}
      <div style={S.listCard}>
        {grouped.length === 0 ? (
          <div style={{ padding: 12, color: "#6b7280", fontSize: 12 }}>No results.</div>
        ) : (
          grouped.map((g, idx) => {
            const isOpen = !!expanded[g.part.id];
            const thumbs = g.rows
              .map((r) => r.thumb_url || r.image_url_1 || r.image_url_2 || null)
              .filter(Boolean)
              .slice(0, 4) as string[];

            const showPlaceholders = Math.max(0, 4 - thumbs.length);

            return (
              <div key={g.part.id} style={{ borderTop: idx === 0 ? "none" : "1px solid #f1f5f9" }}>
                <button onClick={() => toggle(g.part.id)} style={S.groupBtn} type="button">
                  <div style={S.chev}>{isOpen ? "▾" : "▸"}</div>

                  <div style={{ minWidth: 0 }}>
                    <div style={S.groupTitle}>
                      {g.part.part_id} — {g.part.name}{" "}
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>({g.rows.length})</span>
                    </div>

                    <div style={S.previewRow}>
                      {thumbs.map((t, i) => (
                        <MiniThumb key={`${g.part.id}-t-${i}`} src={t} />
                      ))}
                      {Array.from({ length: showPlaceholders }).map((_, i) => (
                        <MiniThumb key={`${g.part.id}-p-${i}`} src={null} />
                      ))}
                      <div style={S.previewLabel}>{thumbs.length > 0 ? "preview" : "no images yet"}</div>
                    </div>
                  </div>

                  <div style={S.showHide}>{isOpen ? "hide" : "show"}</div>
                </button>

                {isOpen ? (
                  <div style={S.groupBody}>
                    {g.rows.map((pc, pcIdx) => (
                      <button
                        key={pc.id}
                        onClick={() => openDetail(pc)}
                        type="button"
                        style={sx(S.pcRowBtn, pcIdx !== 0 && S.pcRowTopBorder)}
                      >
                        <RowThumb src={pc.thumb_url || pc.image_url_1 || pc.image_url_2 || null} />
                        <div style={S.pcId}>
                          {pc.part_color_code ? `ID: ${pc.part_color_code}` : "ID: —"}
                        </div>
                        <div style={S.pcName}>
                          {pc.color?.name ?? "—"}
                          {pc.variant ? <span style={{ color: "#6b7280" }}> • {pc.variant}</span> : null}
                        </div>
                      </button>
                    ))}
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

/** ---------------- styles ---------------- */

const S: Record<string, React.CSSProperties> = {
  topbar: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },

  search: {
    width: "min(520px, 100%)",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "8px 10px",
  },

  errBox: {
    color: "crimson",
    border: "1px solid rgba(220,38,38,.25)",
    background: "rgba(220,38,38,.06)",
    borderRadius: 10,
    padding: "8px 10px",
    fontSize: 12,
  },

  listCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    overflow: "hidden",
    background: "white",
  },

  groupBtn: {
    width: "100%",
    textAlign: "left",
    border: "none",
    background: "white",
    cursor: "pointer",
    padding: "8px 10px",
    display: "grid",
    gridTemplateColumns: "18px 1fr auto",
    gap: 8,
    alignItems: "center",
  },

  chev: { fontSize: 12, color: "#6b7280", width: 18, textAlign: "center" },

  groupTitle: {
    fontWeight: 950,
    fontSize: 13,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  previewRow: { display: "flex", gap: 6, marginTop: 6, alignItems: "center" },
  previewLabel: { fontSize: 11, color: "#9ca3af" },

  showHide: { fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" },

  groupBody: { background: "#fafafa", borderTop: "1px solid #f1f5f9" },

  pcRowBtn: {
    width: "100%",
    textAlign: "left",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: "6px 10px",
    display: "grid",
    gridTemplateColumns: "22px 200px 1fr",
    gap: 8,
    alignItems: "center",
  },
  pcRowTopBorder: { borderTop: "1px solid #edf2f7" },

  pcId: {
    fontWeight: 850,
    fontSize: 12,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  pcName: {
    fontSize: 12,
    color: "#111827",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    display: "grid",
    justifyItems: "end",
    zIndex: 50,
  },

  drawer: {
    height: "100%",
    background: "white",
    padding: 14,
    overflow: "auto",
  },

  drawerHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 10,
    position: "sticky",
    top: 0,
    background: "white",
    paddingBottom: 10,
    zIndex: 1,
    borderBottom: "1px solid #f1f5f9",
  },

  drawerTitle: { fontWeight: 950, fontSize: 13 },

  ghostBtn: {
    border: "1px solid #e5e7eb",
    background: "white",
    borderRadius: 10,
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: 800,
  },

  thumb: {
    width: 22,
    height: 22,
    borderRadius: 7,
    background: "#f3f4f6",
    overflow: "hidden",
    border: "1px solid #e5e7eb",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },

  miniThumb: {
    width: 18,
    height: 18,
    borderRadius: 6,
    background: "#f3f4f6",
    overflow: "hidden",
    border: "1px solid #e5e7eb",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },

  detailGrid: { display: "grid", gap: 12, gridTemplateColumns: "minmax(240px, 360px) 1fr" },

  hero: {
    width: "100%",
    aspectRatio: "1 / 1",
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
  },

  detailCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 14,
    background: "white",
    display: "grid",
    gap: 12,
  },

  idBox: { border: "1px solid #f1f5f9", borderRadius: 12, padding: 10, background: "#fafafa" },
  idLabel: { fontSize: 11, color: "#6b7280", fontWeight: 900 },
  idValue: { fontSize: 13, fontWeight: 950, color: "#111827" },

  link: { fontSize: 12, color: "#2563eb", fontWeight: 900, textDecoration: "none" },

  switchCard: { border: "1px solid #e5e7eb", borderRadius: 16, padding: 10, background: "white" },
  switchLabel: { fontSize: 11, color: "#6b7280", fontWeight: 950, marginBottom: 8 },

  swatchBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #e5e7eb",
    background: "white",
    color: "#111827",
    borderRadius: 999,
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 12,
  },

  swatchBtnActive: {
    border: "1px solid #111827",
    background: "#111827",
    color: "white",
  },

  editWrap: { border: "1px solid #e5e7eb", borderRadius: 16, padding: 12, background: "white" },
};
