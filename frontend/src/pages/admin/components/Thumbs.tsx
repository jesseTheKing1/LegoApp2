import React from "react";

export function RowThumb({ src }: { src?: string | null }) {
  return (
    <div className="h-10 w-10 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
      {src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span className="text-[10px] text-slate-400 font-black">—</span>
      )}
    </div>
  );
}

export function MiniThumb({ src }: { src?: string | null }) {
  return (
    <div className="h-7 w-7 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
      {src ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span className="text-[9px] text-slate-300 font-black">•</span>
      )}
    </div>
  );
}
