import React from "react";
import { Badge } from "../components/ui/Badge";
import { PageShell } from "../layout/PageShell";

export function BrowsePage() {
  return (
    <PageShell>
      <Badge>Browse</Badge>
      <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">Coming soon</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Admin pages are under{" "}
        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-800">
          /admin/*
        </span>
        .
      </p>
    </PageShell>
  );
}
