import type { PartColorRow } from "../../../types/partColor";

export function safeHex(hex?: string | null) {
  if (!hex) return null;
  const h = String(hex).trim();
  if (!h) return null;
  return h.startsWith("#") ? h : `#${h}`;
}

export function buildSuggestedSku(pc: PartColorRow) {
  const pid = pc.part?.part_id ?? "PART";
  const cname = pc.color?.name ?? "COLOR";
  const v = pc.variant ? `-${pc.variant}` : "";
  return `PC-${pid}-${cname}${v}`.replace(/\s+/g, "_").toUpperCase();
}
