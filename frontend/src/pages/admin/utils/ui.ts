export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

export const inputBase =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none " +
  "focus:ring-2 focus:ring-slate-200 focus:border-slate-300";

export const btnBase =
  "rounded-xl px-3 py-2 text-sm font-semibold shadow-sm border border-slate-200 bg-white " +
  "text-slate-900 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed";

export const btnPrimary =
  "rounded-xl px-3 py-2 text-sm font-semibold shadow-sm bg-slate-900 text-white " +
  "hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60 disabled:cursor-not-allowed";

export const btnDanger =
  "rounded-xl px-3 py-2 text-sm font-semibold shadow-sm border border-red-200 bg-red-50 text-red-800 " +
  "hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed";

export const card = "rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden";
