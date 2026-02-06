import React from "react";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(2,6,23,0.08)]">
        <div className="bg-[radial-gradient(900px_500px_at_10%_0%,rgba(15,23,42,0.10),transparent)] p-6 sm:p-10">
          {children}
        </div>
      </div>
    </main>
  );
}
