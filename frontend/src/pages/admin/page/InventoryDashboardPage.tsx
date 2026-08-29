import React, { useEffect, useMemo, useState } from "react";
import api from "../../../api/client";
import { ENDPOINTS } from "../../../api/endpoints";
import type { InventoryDashboard } from "../../../types/inventory";
import { formatApiError } from "../utils/errors";

const card = "rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]";
const money = (value: unknown) => {
  const number = Number(value);
  return value !== null && value !== "" && Number.isFinite(number)
    ? number.toLocaleString("en-US", { style: "currency", currency: "USD" }) : "—";
};

export default function InventoryDashboardPage() {
  const [data, setData] = useState<InventoryDashboard | null>(null);
  const [markup, setMarkup] = useState("25");
  const [filter, setFilter] = useState<"all" | "set" | "part" | "minifig">("all");
  const [query, setQuery] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setErr(null);
    const res = await api.get(ENDPOINTS.inventoryDashboard);
    setData(res.data);
    setMarkup(String(res.data.summary.overall_markup_percent));
  }
  useEffect(() => { load().catch((e) => setErr(formatApiError(e))); }, []);

  const markupNumber = Number(markup);
  const validMarkup = Number.isFinite(markupNumber) && markupNumber >= -100 && markupNumber <= 1000;
  const multiplier = validMarkup ? 1 + markupNumber / 100 : 1;
  const items = data?.pricing_items ?? [];
  const pricedItems = items.filter((item) => item.bricklink_reference_price != null);
  const referenceValue = pricedItems.reduce((sum, item) => sum + Number(item.bricklink_reference_price) * item.quantity_available, 0);
  const projectedValue = referenceValue * multiplier;
  const pricedUnits = pricedItems.reduce((sum, item) => sum + item.quantity_available, 0);
  const visibleItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) =>
      (filter === "all" || item.product_type === filter) &&
      (!needle || `${item.name} ${item.subtitle} ${item.sku}`.toLowerCase().includes(needle))
    );
  }, [items, filter, query]);

  async function applyMarkup() {
    if (!validMarkup || !window.confirm(`Set the overall markup to ${markupNumber}% for every BrickLink-priced product?`)) return;
    setSaving(true); setErr(null); setNotice(null);
    try {
      const res = await api.post(ENDPOINTS.inventoryDashboard, { markup_percent: markupNumber });
      setNotice(`Overall markup saved at ${res.data.overall_markup_percent}%. All BrickLink-priced Part Colors now use it automatically.`);
      await load();
    } catch (e: any) { setErr(formatApiError(e)); }
    finally { setSaving(false); }
  }

  return <div className="space-y-5">
    <section className="overflow-hidden rounded-[30px] bg-slate-950 text-white shadow-xl">
      <div className="bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.28),transparent_42%)] px-5 py-6 sm:px-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Sales planning</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Inventory pricing dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Test a markup against your BrickLink reference prices and see the realistic value of everything currently available to sell.</p>
          </div>
          <div className="w-full rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur lg:w-[350px]">
            <label className="text-xs font-black uppercase tracking-wider text-slate-300">Markup preview</label>
            <div className="mt-2 flex items-center gap-2">
              <div className="relative flex-1"><input type="number" min="-100" max="1000" value={markup} onChange={(e) => setMarkup(e.target.value)} className="h-12 w-full rounded-xl bg-white px-4 pr-10 text-lg font-black text-slate-950 outline-none focus:ring-2 focus:ring-emerald-400"/><span className="absolute right-4 top-3 text-lg font-black text-slate-500">%</span></div>
              <button type="button" onClick={applyMarkup} disabled={!validMarkup || saving} className="h-12 rounded-xl bg-emerald-400 px-4 text-sm font-black text-slate-950 hover:bg-emerald-300 disabled:opacity-50">{saving ? "Saving…" : "Save markup"}</button>
            </div>
            <p className="mt-2 text-xs text-slate-400">Saving changes every BrickLink-based selling price automatically.</p>
          </div>
        </div>
      </div>
    </section>

    {err && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{err}</div>}
    {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</div>}
    {!validMarkup && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Enter a markup between -100% and 1000%.</div>}

    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {[["Available units", data?.summary.sellable_available_units ?? 0, "Sellable, reserved units excluded"], ["BrickLink value", money(referenceValue), `${pricedUnits} priced units`], ["Projected sell value", money(projectedValue), `At ${validMarkup ? markupNumber : 0}% markup`], ["Value added", money(projectedValue-referenceValue), "Above BrickLink reference"]].map(([label,value,detail]) =>
        <div key={String(label)} className={card}><div className="p-4 sm:p-5"><div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</div><div className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</div><div className="mt-1 text-xs text-slate-500">{detail}</div></div></div>)}
    </div>

    <section className={card}>
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div><h2 className="text-lg font-black text-slate-950">Products currently for sale</h2><p className="text-xs text-slate-500">Sets are shown first. Reserved inventory is excluded.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex rounded-xl bg-slate-100 p-1">{(["all","set","part","minifig"] as const).map(type => <button key={type} onClick={()=>setFilter(type)} className={`rounded-lg px-3 py-2 text-xs font-black capitalize ${filter===type?"bg-white text-slate-950 shadow-sm":"text-slate-500"}`}>{type === "all" ? "All" : `${type}s`}</button>)}</div>
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search products…" className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"/>
        </div>
      </div>
      <div className="hidden grid-cols-[minmax(260px,1.5fr)_70px_repeat(4,minmax(100px,1fr))] gap-3 border-b border-slate-100 px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 lg:grid"><div>Product</div><div>Qty</div><div>BrickLink</div><div>Current</div><div>Preview</div><div>Total</div></div>
      <div className="divide-y divide-slate-100">{visibleItems.map(item => {
        const reference = item.bricklink_reference_price == null ? null : Number(item.bricklink_reference_price);
        const projected = reference == null ? null : reference * multiplier;
        return <div key={item.catalog_item_id} className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(260px,1.5fr)_70px_repeat(4,minmax(100px,1fr))] lg:items-center lg:px-5">
          <div className="flex min-w-0 items-center gap-3"><div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">{item.image_url?<img src={item.image_url} alt="" className="h-full w-full object-contain"/>:<span className="text-[10px] font-black uppercase text-slate-400">{item.product_type}</span>}</div><div className="min-w-0"><div className="truncate text-sm font-black text-slate-950">{item.name}</div><div className="truncate text-xs text-slate-500">{item.subtitle || item.sku}</div><span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-500">{item.product_type}</span></div></div>
          <PriceCell mobile="Available" value={item.quantity_available}/><PriceCell mobile="BrickLink" value={money(reference)}/><PriceCell mobile="Current" value={money(item.current_price)}/><PriceCell mobile="Preview" value={money(projected)} green/><PriceCell mobile="Total" value={projected == null ? "—" : money(projected*item.quantity_available)} strong/>
        </div>})}{!visibleItems.length && <div className="px-5 py-12 text-center text-sm text-slate-500">No sellable inventory matches this view.</div>}</div>
    </section>

    <div className="grid gap-4 lg:grid-cols-2"><Breakdown title="Inventory by condition" rows={(data?.by_condition??[]).map(r=>[r.condition,`${r.quantity} units`])}/><Breakdown title="Inventory by location" rows={(data?.by_location??[]).map(r=>[`${r.location__name} · ${r.location__code}`,String(r.quantity)])}/></div>
  </div>;
}

function PriceCell({mobile,value,green,strong}:{mobile:string;value:React.ReactNode;green?:boolean;strong?:boolean}) { return <div className={`text-sm ${green?"font-black text-emerald-700":strong?"font-black text-slate-950":"font-bold text-slate-700"}`}><span className="mr-2 text-xs font-medium text-slate-400 lg:hidden">{mobile}</span>{value}</div>; }
function Breakdown({title,rows}:{title:string;rows:Array<[string,string]>}) { return <div className={card}><div className="p-5"><h3 className="font-black text-slate-950">{title}</h3><div className="mt-4 space-y-2">{rows.map(([label,value])=><div key={label} className="flex justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="font-bold capitalize text-slate-700">{label}</span><span className="font-black text-slate-950">{value}</span></div>)}</div></div></div>; }
