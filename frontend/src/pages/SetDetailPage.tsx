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

function PartRow({ row }: { row: SetPart }) {
  const image = row.part_color_detail.image_url_1 || row.part_color_detail.image_url_2 || row.part_color_detail.part.image_url;
  const missing = row.missing_quantity ?? row.quantity;
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
  const missingRequired = useMemo(() => set?.parts.reduce((sum, row) => sum + (row.missing_quantity ?? row.quantity), 0) || 0, [set]);
  const coverage = totalRequired ? Math.round(((totalRequired - missingRequired) / totalRequired) * 100) : 0;
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
                  <strong>{me ? money(set.missing_parts_price) : "Sign in to calculate"}</strong>
                  {me ? <p className="set-savings">You save {money(set.inventory_savings)} with pieces you own</p> : <Link to="/register">Create a free collection →</Link>}
                </div>
              </div>
              {me ? (
                <div className="set-match">
                  <div><span>YOUR BUILD MATCH</span><strong>{coverage}%</strong></div>
                  <div className="set-match-track"><i style={{ width: `${coverage}%` }} /></div>
                  <p>You own {totalRequired - missingRequired} of {totalRequired} listed pieces. Only {missingRequired} left to complete this build.</p>
                </div>
              ) : null}
              <a href="#parts" className="set-primary-action">See every required part ↓</a>
            </div>
          </div>
        </div>
      </section>

      <section id="parts" className="shop-wrap set-parts-section">
        <div className="set-parts-heading">
          <div><p className="shop-kicker">COMPLETE PARTS LIST</p><h2>Everything in this build</h2></div>
          <div><strong>{missingRequired}</strong><small>pieces still needed</small></div>
        </div>
        <div className="set-parts-table-wrap">
          <table className="set-parts-table">
            <thead><tr><th>Part</th><th>Qty</th><th>Each</th><th>Full price</th><th>Your inventory</th><th>Your price</th></tr></thead>
            <tbody>{set.parts.map((part) => <PartRow key={part.id} row={part} />)}</tbody>
          </table>
        </div>
        {priced < totalRequired ? (
          <p className="set-pricing-note">Prices are calculated from parts currently priced in your catalog. Unpriced pieces are marked “Not priced” and are not included in totals yet.</p>
        ) : null}
      </section>
    </main>
  );
}
