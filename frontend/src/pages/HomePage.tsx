import { Me } from "../auth/AuthContext";
import { Badge } from "../components/ui/Badge";
import { ButtonLink } from "../components/ui/Button";
import { PageShell } from "../layout/PageShell";

export function HomePage({ me }: { me: Me | null }) {
  return (
    <PageShell>
      <Badge>Inventory • Pricing • Sets • Minifigs</Badge>

      <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
        Create new sets with existing pieces!
      </h1>

      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
        Keep your catalog clean, price parts accurately, and build sets with confidence.
        {me ? " You’re signed in — jump back in." : " Create an account to get started."}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {me ? (
          <>
            {me.is_staff ? (
              <ButtonLink to="/admin/parts" variant="primary" size="lg">
                Open Admin
              </ButtonLink>
            ) : (
              <ButtonLink to="/account" variant="primary" size="lg">
                My Account
              </ButtonLink>
            )}
            <ButtonLink to="/browse" variant="secondary" size="lg">
              Browse
            </ButtonLink>
          </>
        ) : (
          <>
            <ButtonLink to="/register" variant="primary" size="lg">
              Create account
            </ButtonLink>
            <ButtonLink to="/login" variant="secondary" size="lg">
              Log in
            </ButtonLink>
          </>
        )}
      </div>
    </PageShell>
  );
}
