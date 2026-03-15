import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import type { Theme } from "../../../types/minifig";
import { DrawerShell } from "../components/DrawerShell";
import { ThemeForm, type ThemePayload } from "../form/ThemeForm";
import { ThemeDetailDrawer } from "../components/ThemeDetailDrawer";
import { getListData } from "../utils/list";
import { formatApiError } from "../utils/errors";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

const inputBase =
  "w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition " +
  "placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-200/70";

const shellCard =
  "rounded-[28px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]";

export default function ThemesAdminPage() {
  const [items, setItems] = useState<Theme[]>([]);
  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<Theme | null>(null);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadAll() {
    setErr(null);
    const res = await api.get(ENDPOINTS.themes);
    setItems(getListData<Theme>(res.data));
  }

  useEffect(() => {
    loadAll().catch((e) => setErr(formatApiError(e)));
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((t) => t.name.toLowerCase().includes(qq));
  }, [items, q]);

  function openDetail(theme: Theme) {
    setSelected(theme);
    setDetailOpen(true);
    setErr(null);
  }

  function applyPatched(theme: Theme) {
    setSelected(theme);
    setItems((prev) => prev.map((x) => (x.id === theme.id ? theme : x)));
  }

  async function create(payload: ThemePayload) {
    setSaving(true);
    setErr(null);
    try {
      await api.post(ENDPOINTS.themes, payload);
      setCreateOpen(false);
      await loadAll();
    } catch (e: any) {
      setErr(formatApiError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className={shellCard}>
          <div className="p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
              Themes
            </div>
            <div className="mt-1 text-2xl font-black text-slate-950">{items.length}</div>
          </div>
        </div>

        <div className={shellCard}>
          <div className="p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
              With image
            </div>
            <div className="mt-1 text-2xl font-black text-slate-950">
              {items.filter((x) => !!x.image_url).length}
            </div>
          </div>
        </div>

        <div className={shellCard}>
          <div className="p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
              No image
            </div>
            <div className="mt-1 text-2xl font-black text-slate-950">
              {items.filter((x) => !x.image_url).length}
            </div>
          </div>
        </div>
      </div>

      <div className={shellCard}>
        <div className="border-b border-slate-200/80 px-5 py-4">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Theme admin
          </div>
          <div className="mt-1 text-lg font-black text-slate-950">
            Create and manage LEGO themes
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <input
              className={cx(inputBase, "xl:max-w-md")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search themes..."
              autoComplete="off"
            />

            <div className="flex flex-wrap gap-2 xl:ml-auto">
              <button
                type="button"
                className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-800"
                onClick={() => setCreateOpen(true)}
              >
                + New theme
              </button>

              <button
                type="button"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50"
                onClick={() => loadAll().catch(() => {})}
              >
                Refresh
              </button>
            </div>
          </div>

          {err ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
              <div className="text-sm font-semibold text-slate-700">No themes found</div>
              <div className="mt-1 text-sm text-slate-500">
                Create your first theme to use it in minifigures and sets.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => openDetail(theme)}
                  className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white text-left shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]"
                >
                  <div className="aspect-[4/3] bg-[radial-gradient(circle_at_top,#f8fafc,white_62%)] p-4">
                    {theme.image_url ? (
                      <img
                        src={theme.image_url}
                        alt=""
                        className="h-full w-full object-cover rounded-[22px] transition group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="grid h-full place-items-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-400">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-200 bg-white p-4">
                    <div className="truncate text-base font-black text-slate-950">
                      {theme.name}
                    </div>

                    <div className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      Open editor →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <DrawerShell
        open={createOpen}
        title="New Theme"
        onClose={() => setCreateOpen(false)}
        width={1180}
      >
        <ThemeForm submitting={saving} onSubmit={create} />
      </DrawerShell>

      <ThemeDetailDrawer
        open={detailOpen}
        selected={selected}
        saving={saving}
        setSaving={setSaving}
        err={err}
        setErr={setErr}
        onClose={() => {
          setDetailOpen(false);
          setSelected(null);
          setErr(null);
        }}
        onPatched={(theme) => {
          applyPatched(theme);
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