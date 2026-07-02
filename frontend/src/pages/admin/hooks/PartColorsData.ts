import { useCallback, useEffect, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import type { PartColorRow } from "../../../types/partColor";
import type { CatalogItemMini } from "../../../types/catalog";
import type { Part } from "../../../types/part";
import type { Color } from "../../../types/color";
import { getListData } from "../utils/list";
import { formatApiError } from "../utils/errors";

export function usePartColorsData() {
  const [items, setItems] = useState<PartColorRow[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItemMini[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setErr(null);
    const [pcRes, pRes, cRes, catRes] = await Promise.all([
      api.get(ENDPOINTS.partColors),
      api.get(ENDPOINTS.parts),
      api.get(ENDPOINTS.colors),
      api.get(ENDPOINTS.catalog, { params: { compact: 1 } }),
    ]);

    setItems(getListData<PartColorRow>(pcRes.data));
    setParts(getListData<Part>(pRes.data));
    setColors(getListData<Color>(cRes.data));
    setCatalogItems(getListData<CatalogItemMini>(catRes.data));
  }, []);

  useEffect(() => {
    loadAll().catch((e) => setErr(formatApiError(e)));
  }, [loadAll]);

  const patchOnePartColor = useCallback((pc: PartColorRow) => {
    setItems((prev) => prev.map((x) => (x.id === pc.id ? pc : x)));
  }, []);

  const refreshCatalog = useCallback(async () => {
    const catRes = await api.get(ENDPOINTS.catalog, { params: { compact: 1 } });
    setCatalogItems(getListData<CatalogItemMini>(catRes.data));
  }, []);

  const createPartColor = useCallback(
    async (payload: any) => {
      setSaving(true);
      setErr(null);
      try {
        await api.post(ENDPOINTS.partColors, payload);
        await loadAll();
      } catch (e: any) {
        setErr(formatApiError(e));
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [loadAll]
  );

  const updatePartColor = useCallback(async (id: number, payload: any) => {
    setSaving(true);
    setErr(null);
    try {
      const res = await api.patch(`${ENDPOINTS.partColors}${id}/`, payload);
      patchOnePartColor(res.data);
      await refreshCatalog();
      return res.data as PartColorRow;
    } catch (e: any) {
      setErr(formatApiError(e));
      throw e;
    } finally {
      setSaving(false);
    }
  }, [patchOnePartColor, refreshCatalog]);

  const deletePartColor = useCallback(async (id: number) => {
    setSaving(true);
    setErr(null);
    try {
      await api.delete(`${ENDPOINTS.partColors}${id}/`);
      await loadAll();
    } catch (e: any) {
      setErr(formatApiError(e));
      throw e;
    } finally {
      setSaving(false);
    }
  }, [loadAll]);

  return {
    items, parts, colors, catalogItems,
    saving, setSaving,
    err, setErr,
    loadAll,
    patchOnePartColor,
    refreshCatalog,
    createPartColor,
    updatePartColor,
    deletePartColor,
  };
}
