import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import type { LibraryPickerMode, LibraryPickerResult } from "../types/libraryPicker";
import { ProductCard } from "./HomePage";

export function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [results, setResults] = useState<LibraryPickerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const rawType = params.get("type");
  const type: LibraryPickerMode = rawType === "set" || rawType === "minifig" ? rawType : "all";

  useEffect(() => {
    let active = true;
    setQuery(params.get("q") || "");
    setLoading(true);
    const q = params.get("q") || "";
    const requests = type === "all"
      ? [
          api.get<LibraryPickerResult[]>(ENDPOINTS.libraryPickerLookup, { params: { q, type: "set", limit: 30 } }),
          api.get<LibraryPickerResult[]>(ENDPOINTS.libraryPickerLookup, { params: { q, type: "minifig", limit: 30 } }),
        ]
      : [api.get<LibraryPickerResult[]>(ENDPOINTS.libraryPickerLookup, { params: { q, type, limit: 60 } })];
    Promise.all(requests).then((responses) => {
      if (active) setResults(responses.flatMap((response) => response.data));
    }).catch(() => active && setResults([])).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [params, type]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (query.trim()) next.q = query.trim();
    if (type !== "all") next.type = type;
    setParams(next);
  }

  function changeType(nextType: "all" | "set" | "minifig") {
    const next: Record<string, string> = {};
    if (params.get("q")) next.q = params.get("q")!;
    if (nextType !== "all") next.type = nextType;
    setParams(next);
  }

  return (
    <main className="shop-home browse-page">
      <section className="browse-hero">
        <div className="shop-wrap">
          <p className="shop-kicker">THE BRICKWISE CATALOG</p>
          <h1>Find your next favorite build.</h1>
          <form className="shop-search" onSubmit={submit}>
            <div className="shop-search-icon">⌕</div>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search sets, themes, minifigures or set numbers" />
            <span />
            <button type="submit">Search</button>
          </form>
        </div>
      </section>
      <section className="shop-wrap browse-results">
        <div className="shop-section-head">
          <div><p>SHOP THE CATALOG</p><h2>{params.get("q") ? `Results for “${params.get("q")}”` : "All builds"}</h2></div>
          <div className="shop-tabs">
            {(["all", "set", "minifig"] as const).map((tab) => (
              <button key={tab} className={type === tab ? "active" : ""} onClick={() => changeType(tab)}>
                {tab === "all" ? "Everything" : tab === "set" ? "Sets" : "Minifigures"}
              </button>
            ))}
          </div>
        </div>
        {loading ? <div className="shop-loading">Searching the collection…</div> :
          results.length ? <div className="shop-products">{results.map((item, i) => <ProductCard item={item} index={i} key={`${item.type}-${item.id}`} />)}</div> :
          <div className="shop-empty"><h3>No matches yet.</h3><p>Try another name, theme, or set number.</p></div>}
      </section>
    </main>
  );
}
