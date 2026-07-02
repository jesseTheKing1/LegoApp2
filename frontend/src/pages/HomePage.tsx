import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { Me } from "../auth/AuthContext";
import type { LibraryPickerResult } from "../types/libraryPicker";

type ShopKind = "all" | "set" | "minifig";

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.7-4.7m2.2-5.3a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
);

const BoxIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 7 8-4 8 4-8 4-8-4Zm0 0v10l8 4 8-4V7M12 11v10" /></svg>
);

const SparkIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 13.8 8.2 19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 13 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
);

const FALLBACKS = [
  "linear-gradient(145deg,#e8f1ff,#b9d3ff)",
  "linear-gradient(145deg,#fff1c7,#ffd36a)",
  "linear-gradient(145deg,#e4f7e8,#9bd7a8)",
  "linear-gradient(145deg,#f3e9ff,#ceb0f4)",
];

export function ProductCard({ item, index }: { item: LibraryPickerResult; index: number }) {
  const isSet = item.type === "set";
  return (
    <article className="shop-product">
      <div className="shop-product-image" style={{ background: FALLBACKS[index % FALLBACKS.length] }}>
        <span className="shop-product-pill">{isSet ? "SET" : "MINIFIG"}</span>
        {item.image_url ? (
          <img src={item.image_url} alt={item.title} loading="lazy" />
        ) : (
          <div className="shop-placeholder" aria-hidden="true">
            {isSet ? <BoxIcon /> : "◉"}
          </div>
        )}
        <button className="shop-heart" aria-label={`Save ${item.title}`}>♡</button>
      </div>
      <div className="shop-product-body">
        <p className="shop-product-theme">{item.meta?.theme_name || (isSet ? "LEGO set" : "Collectible minifigure")}</p>
        <h3>{item.title}</h3>
        <p className="shop-product-meta">{item.subtitle}</p>
        <div className="shop-product-action">
          <span>{isSet ? `${item.meta?.official_piece_count || "—"} pieces` : item.meta?.bricklink_id}</span>
          <Link to={`/browse?q=${encodeURIComponent(item.title)}`} aria-label={`View ${item.title}`}>
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function HomePage({ me }: { me: Me | null }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<ShopKind>("all");
  const [items, setItems] = useState<LibraryPickerResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api.get<LibraryPickerResult[]>(ENDPOINTS.libraryPickerLookup, { params: { type: "set", limit: 8 } }),
      api.get<LibraryPickerResult[]>(ENDPOINTS.libraryPickerLookup, { params: { type: "minifig", limit: 8 } }),
    ])
      .then(([sets, figs]) => {
        if (active) setItems([...sets.data.slice(0, 6), ...figs.data.slice(0, 6)]);
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const visibleItems = useMemo(() => {
    const filtered = kind === "all" ? items : items.filter((item) => item.type === kind);
    return filtered.slice(0, 8);
  }, [items, kind]);

  function search(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (kind !== "all") params.set("type", kind);
    navigate(`/browse${params.size ? `?${params}` : ""}`);
  }

  return (
    <main className="shop-home">
      <section className="shop-hero">
        <div className="shop-wrap shop-hero-grid">
          <div className="shop-hero-copy">
            <div className="shop-eyebrow"><span /> Your collection can build more</div>
            <h1>Build what’s next.<br /><em>Start with what you own.</em></h1>
            <p>
              Discover sets and minifigures, match them against your collection, and buy
              only the pieces you’re missing.
            </p>
            <form className="shop-search" onSubmit={search}>
              <div className="shop-search-icon"><SearchIcon /></div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sets, minifigures, themes or set numbers"
                aria-label="Search the shop"
              />
              <select value={kind} onChange={(e) => setKind(e.target.value as ShopKind)} aria-label="Search category">
                <option value="all">Everything</option>
                <option value="set">Sets</option>
                <option value="minifig">Minifigures</option>
              </select>
              <button type="submit">Search</button>
            </form>
            <div className="shop-popular">
              <span>Popular:</span>
              {["Star Wars", "Technic", "Architecture", "Harry Potter"].map((term) => (
                <button key={term} onClick={() => navigate(`/browse?q=${encodeURIComponent(term)}`)}>{term}</button>
              ))}
            </div>
          </div>

          <div className="shop-hero-art" aria-label="A preview showing 80% of a set already owned">
            <div className="brick brick-red"><i /><i /><i /><i /></div>
            <div className="brick brick-blue"><i /><i /><i /></div>
            <div className="brick brick-yellow"><i /><i /></div>
            <div className="build-card">
              <div className="build-card-top">
                <span><SparkIcon /></span>
                <div><small>BUILD MATCH</small><strong>You already own 80%</strong></div>
              </div>
              <div className="build-progress"><i /></div>
              <div className="build-stats">
                <div><strong>1,984</strong><small>pieces owned</small></div>
                <div><strong>486</strong><small>pieces missing</small></div>
              </div>
              <button onClick={() => navigate(me ? "/account" : "/register")}>
                {me ? "View my collection" : "Check my collection"} <ArrowIcon />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="shop-trust">
        <div className="shop-wrap">
          <div><span><CheckIcon /></span><p><strong>Know before you buy</strong><small>See exactly what you already own</small></p></div>
          <div><span><BoxIcon /></span><p><strong>Buy only what’s missing</strong><small>Complete builds for less</small></p></div>
          <div><span><SparkIcon /></span><p><strong>Unlock your collection</strong><small>Find thousands of new possibilities</small></p></div>
        </div>
      </section>

      <section className="shop-featured shop-wrap">
        <div className="shop-section-head">
          <div><p>EXPLORE THE CATALOG</p><h2>Find your next build</h2></div>
          <div className="shop-tabs" role="group" aria-label="Product category">
            {(["all", "set", "minifig"] as ShopKind[]).map((tab) => (
              <button key={tab} className={kind === tab ? "active" : ""} onClick={() => setKind(tab)}>
                {tab === "all" ? "Featured" : tab === "set" ? "Sets" : "Minifigures"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="shop-loading">Finding brilliant builds…</div>
        ) : visibleItems.length ? (
          <div className="shop-products">{visibleItems.map((item, index) => <ProductCard key={`${item.type}-${item.id}`} item={item} index={index} />)}</div>
        ) : (
          <div className="shop-empty">
            <BoxIcon />
            <h3>Your catalog is ready for its first spotlight.</h3>
            <p>Add sets or minifigures in admin and they’ll appear here automatically.</p>
          </div>
        )}
        <div className="shop-view-all"><Link to="/browse">Explore the full catalog <ArrowIcon /></Link></div>
      </section>

      <section className="shop-how">
        <div className="shop-wrap">
          <div className="shop-how-copy">
            <p className="shop-kicker">THE SMARTER WAY TO BUILD</p>
            <h2>Turn the pieces you have into the builds you want.</h2>
            <p>Register your collection once. We’ll do the counting, matching, and hunting from there.</p>
            <Link to={me ? "/account" : "/register"}>{me ? "Open my collection" : "Start your free collection"} <ArrowIcon /></Link>
          </div>
          <ol className="shop-steps">
            <li><span>01</span><div><strong>Add what you own</strong><p>Log your sets, loose pieces, and minifigures in one organized collection.</p></div></li>
            <li><span>02</span><div><strong>Discover what you can build</strong><p>See full matches and near-matches ranked by how close you are.</p></div></li>
            <li><span>03</span><div><strong>Complete the build</strong><p>Order one precise list of missing pieces—nothing you already have.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="shop-cta">
        <div className="shop-wrap">
          <p><SparkIcon /> YOUR BRICKS. MORE POSSIBILITIES.</p>
          <h2>See what your collection<br />can become.</h2>
          <Link to={me ? "/account" : "/register"}>{me ? "Go to my collection" : "Create a free account"} <ArrowIcon /></Link>
        </div>
      </section>

      <footer className="shop-footer">
        <div className="shop-wrap">
          <div><strong>Brickwise</strong><p>Build more. Buy smarter.</p></div>
          <div><Link to="/browse">Shop sets</Link><Link to="/browse?type=minifig">Minifigures</Link><Link to="/register">My collection</Link></div>
          <small>LEGO® is a trademark of the LEGO Group, which does not sponsor or endorse this site.</small>
        </div>
      </footer>
    </main>
  );
}
