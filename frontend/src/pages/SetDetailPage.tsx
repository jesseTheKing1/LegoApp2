import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import type { LegoSet, SetPart } from "../types/set";

function money(value: string | number | null | undefined) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "Not priced";
}

function PartRow({ row, ownedComplete = false }: { row: SetPart; ownedComplete?: boolean }) {
  const image = row.part_color_detail.image_url_1 || row.part_color_detail.image_url_2 || row.part_color_detail.part.image_url;
  const missing = ownedComplete ? 0 : (row.missing_quantity ?? row.quantity);
  return (
    <tr className={missing === 0 ? "set-part-owned" : ""}>
      <td>
        <div className="set-part-name">
          <div className="set-part-thumb">{image ? <img src={image} alt="" loading="lazy" /> : "◇"}</div>
          <div><strong>{row.part_color_detail.part.name}</strong><small>{row.part_color_detail.part.part_id} · {row.part_color_detail.color.name}</small></div>
        </div>
      </td>
      <td>{row.quantity}</td>
      <td>{money(row.unit_price)}</td>
      <td>{money(row.line_total)}</td>
      <td><span className={missing === 0 ? "owned-badge" : "missing-badge"}>{missing === 0 ? "You have it" : `${missing} needed`}</span></td>
      <td>{missing === 0 ? "$0.00" : money(row.missing_line_total)}</td>
    </tr>
  );
}

export function SetDetailPage() {
  const { setNum } = useParams();
  const { me } = useAuth();
  const [set, setSet] = useState<LegoSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get<LegoSet>(`${ENDPOINTS.sets}${encodeURIComponent(setNum || "")}/`)
      .then((response) => setSet(response.data))
      .catch(() => setError("We couldn’t find that set."))
      .finally(() => setLoading(false));
  }, [setNum]);

  const priced = set?.priced_part_quantity || 0;
  const totalRequired = useMemo(() => set?.parts.reduce((sum, row) => sum + row.quantity, 0) || 0, [set]);
  const calculatedMissing = useMemo(() => set?.parts.reduce((sum, row) => sum + (row.missing_quantity ?? row.quantity), 0) || 0, [set]);
  const missingRequired = set?.is_in_collection ? 0 : calculatedMissing;
  const coverage = set?.is_in_collection ? 100 : totalRequired ? Math.round(((totalRequired - missingRequired) / totalRequired) * 100) : 0;
  const fullPrice = set?.catalog_item?.current_price || set?.parts_total_price;

  if (loading) return <main className="set-detail-loading">Calculating this build…</main>;
  if (!set || error) return <main className="set-detail-loading">{error}</main>;

  return (
    <main className="shop-home set-detail">
      <section className="set-detail-hero">
        <div className="shop-wrap">
          <Link className="set-back" to="/browse">← Back to all sets</Link>
          <div className="set-detail-grid">
            <div className="set-main-image">{set.image_url ? <img src={set.image_url} alt={set.name} /> : <span>◇</span>}</div>
            <div className="set-detail-copy">
              <p className="shop-kicker">{set.theme?.name || "LEGO SET"} · {set.set_num}</p>
              <h1>{set.name}</h1>
              <p className="set-piece-count">{set.official_piece_count || totalRequired} pieces · {set.parts.length} unique parts</p>
              <div className="set-price-box">
                <div><small>FULL BUILD PRICE</small><strong>{money(fullPrice)}</strong><p>{priced} of {totalRequired} required pieces currently priced</p></div>
                <div className="set-personal-price">
                  <small>{me ? "YOUR PRICE USING YOUR INVENTORY" : "UNLOCK YOUR INVENTORY PRICE"}</small>
                  <strong>{me ? set.is_in_collection ? "✓ Already owned" : money(set.missing_parts_price) : "Sign in to calculate"}</strong>
                  {me ? <p className="set-savings">{set.is_in_collection ? set.collection_set_locked ? "Kept assembled and protected from parts matching" : "Registered in your collection" : `You save ${money(set.inventory_savings)} with pieces you own`}</p> : <Link to="/register">Create a free collection →</Link>}
                </div>
              </div>
              {me ? (
                <div className="set-match">
                  <div><span>YOUR BUILD MATCH</span><strong>{coverage}%</strong></div>
                  <div className="set-match-track"><i style={{ width: `${coverage}%` }} /></div>
                  <p>{set.is_in_collection ? "This complete set is already registered in your collection." : `You own ${totalRequired - missingRequired} of ${totalRequired} listed pieces. Only ${missingRequired} left to complete this build.`}</p>
                </div>
              ) : null}
              <a href="#parts" className="set-primary-action">See every required part ↓</a>
            </div>
          </div>
        </div>
      </section>

      {me && (set.collection_sources?.length || set.is_in_collection) ? (
        <section className="set-sources">
          <div className="shop-wrap">
            <div className="set-sources-head"><p className="shop-kicker">WHERE YOUR PIECES COME FROM</p><h2>{set.is_in_collection ? "This build is already yours." : "Your collection supplies this build."}</h2><p>{set.collection_set_locked ? "This set is locked, so it stays assembled and its pieces will not be offered to other builds." : "Only unlocked sets contribute pieces. Lock any favorite build from your account to keep it assembled."}</p></div>
            {!set.collection_set_locked && set.collection_sources?.length ? <div className="set-source-grid">{set.collection_sources.map(source=><article key={`${source.type}-${source.id}`}>
              <div className="source-set-image">{source.image_url?<img src={source.image_url} alt={source.name}/>:"◇"}</div>
              <p>{source.type==="set"?"REGISTERED SET":"LOOSE INVENTORY"}</p>
              <h3>{source.name}</h3>
              {source.set_num&&<small>{source.set_num}</small>}
              <strong>{source.percentage}% <span>of this build</span></strong>
              <div className="source-piece-count">{source.piece_count} pieces supplied</div>
              <details className="source-parts">
                <summary>See all {source.parts.length} piece types</summary>
                <div className="source-parts-list">{source.parts.map(part=><div key={part.part_color_id}>
                  <span>{part.image_url?<img src={part.image_url} alt=""/>:"◇"}</span>
                  <p><b>{part.name}</b><small>{part.part_id} · {part.color_name}</small></p>
                  <strong>×{part.quantity}</strong>
                </div>)}</div>
              </details>
            </article>)}</div> : null}
          </div>
        </section>
      ) : null}

      <section id="parts" className="shop-wrap set-parts-section">
        <div className="set-parts-heading">
          <div><p className="shop-kicker">COMPLETE PARTS LIST</p><h2>Everything in this build</h2></div>
          <div><strong>{missingRequired}</strong><small>pieces still needed</small></div>
        </div>
        <div className="set-parts-table-wrap">
          <table className="set-parts-table">
            <thead><tr><th>Part</th><th>Qty</th><th>Each</th><th>Full price</th><th>Your inventory</th><th>Your price</th></tr></thead>
            <tbody>{set.parts.map((part) => <PartRow key={part.id} row={part} ownedComplete={!!set.is_in_collection} />)}</tbody>
          </table>
        </div>
        {priced < totalRequired ? (
          <p className="set-pricing-note">Prices are calculated from parts currently priced in your catalog. Unpriced pieces are marked “Not priced” and are not included in totals yet.</p>
        ) : null}
      </section>
    </main>
  );
}
