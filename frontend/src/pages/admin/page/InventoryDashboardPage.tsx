import React, { useEffect, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import type { InventoryDashboard } from "../../../types/inventory";
import { formatApiError } from "../utils/errors";

const shellCard =
  "rounded-[28px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]";

export default function InventoryDashboardPage() {
  const [data, setData] = useState<InventoryDashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    const res = await api.get(ENDPOINTS.inventoryDashboard);
    setData(res.data);
  }

  useEffect(() => {
    load().catch((e) => setErr(formatApiError(e)));
  }, []);

  const summary = data?.summary;

  return (
    <div className="space-y-5">
      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {[
          { label: "Total Units", value: summary?.total_units ?? 0 },
          { label: "Reserved", value: summary?.total_reserved ?? 0 },
          { label: "Available", value: summary?.total_available ?? 0 },
          { label: "Active SKUs", value: summary?.active_skus ?? 0 },
          { label: "Cost Basis", value: `$${summary?.total_cost ?? 0}` },
        ].map((stat) => (
          <div key={stat.label} className={shellCard}>
            <div className="p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                {stat.label}
              </div>
              <div className="mt-1 text-2xl font-black text-slate-950">
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className={shellCard}>
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="text-lg font-black text-slate-950">Inventory by Condition</div>
          </div>
          <div className="p-5 space-y-3">
            {(data?.by_condition ?? []).map((row) => (
              <div key={row.condition} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-black text-slate-900">{row.condition}</div>
                  <div className="text-sm font-semibold text-slate-600">{row.quantity} units</div>
                </div>
                <div className="mt-1 text-xs text-slate-500">{row.count} records</div>
              </div>
            ))}
          </div>
        </div>

        <div className={shellCard}>
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="text-lg font-black text-slate-950">Inventory by Location</div>
          </div>
          <div className="p-5 space-y-3">
            {(data?.by_location ?? []).map((row) => (
              <div key={row.location__id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-900">{row.location__name}</div>
                    <div className="text-xs text-slate-500">{row.location__code}</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-600">{row.quantity} units</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={shellCard}>
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-lg font-black text-slate-950">Product Type Counts</div>
        </div>
        <div className="grid grid-cols-3 gap-4 p-5">
          {[
            ["Sets", data?.product_type_counts?.sets ?? 0],
            ["Minifigs", data?.product_type_counts?.minifigs ?? 0],
            ["Part Colors", data?.product_type_counts?.part_colors ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                {label}
              </div>
              <div className="mt-1 text-2xl font-black text-slate-950">{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}