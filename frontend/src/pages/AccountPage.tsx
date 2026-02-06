import React from "react";
import { Me } from "../auth/AuthContext";
import { Badge } from "../components/ui/Badge";
import { PageShell } from "../layout/PageShell";

export function AccountPage({ me }: { me: Me }) {
  return (
    <PageShell>
      <Badge>Account</Badge>
      <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
        Welcome, @{me.username}
      </h2>
    </PageShell>
  );
}
