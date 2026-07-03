import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { Me } from "../auth/AuthContext";
import type { LibraryPickerResult, LibraryPickerMode } from "../types/libraryPicker";

type Tab = "overview" | "sets" | "parts" | "minifigs";
type Summary = { set_count:number; unique_sets:number; piece_count:number; loose_piece_count:number; minifig_count:number; minifig_value:string; set_value:string; loose_parts_value:string; total_value:string };
type OwnedSet = { id:number; quantity:number; is_locked:boolean; contributed_piece_count:number; set:{ id:number; set_num:string; name:string; image_url?:string; official_piece_count:number; theme_name:string; year_released?:number|null; bricklink_value?:string|null } };
type OwnedPart = { id:number; quantity:number; part_color:{ id:number; part_color_code:string; name:string; part_id:string; color_name:string; image_url?:string } };
type OwnedFig = { id:number; quantity:number; minifig:{ id:number; bricklink_id:string; name:string; image_url?:string; theme_name:string; market_value:string|null; rarity:string } };

const tabs: { id:Tab; label:string }[] = [
  { id:"overview", label:"Overview" }, { id:"sets", label:"My Sets" },
  { id:"parts", label:"Loose Pieces" }, { id:"minifigs", label:"Minifigures" },
];

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n) : "Unpriced";
}

function AddPanel({ tab, onAdded }:{ tab:Exclude<Tab,"overview">; onAdded:()=>void }) {
  const [q,setQ] = useState("");
  const [results,setResults] = useState<LibraryPickerResult[]>([]);
  const [searching,setSearching] = useState(false);
  const [themes,setThemes] = useState<{id:number;name:string}[]>([]);
  const [theme,setTheme] = useState("");
  const [year,setYear] = useState("");
  const [hasSearched,setHasSearched] = useState(false);
  const mode:LibraryPickerMode = tab === "sets" ? "set" : tab === "parts" ? "part_color" : "minifig";
  useEffect(()=>{
    if(tab!=="sets") return;
    api.get(ENDPOINTS.themes).then(r=>setThemes(r.data));
    api.get<LibraryPickerResult[]>(ENDPOINTS.libraryPickerLookup,{params:{type:"set",limit:12}}).then(r=>setResults(r.data));
  },[tab]);
  async function search() {
    setSearching(true);
    setHasSearched(true);
    try {
      const res = await api.get<LibraryPickerResult[]>(ENDPOINTS.libraryPickerLookup,{params:{q,type:mode,theme:theme||undefined,year:year||undefined,limit:24}});
      setResults(res.data);
    } finally { setSearching(false); }
  }
  async function add(item:LibraryPickerResult) {
    const endpoint = tab === "sets" ? ENDPOINTS.collectionSets : tab === "parts" ? ENDPOINTS.collectionParts : ENDPOINTS.collectionMinifigs;
    const key = tab === "sets" ? "set_id" : tab === "parts" ? "part_color_id" : "minifig_id";
    await api.post(endpoint,{[key]:item.id,quantity:1});
    onAdded();
  }
  return <div className="collection-add">
    <div><p>ADD TO YOUR COLLECTION</p><h3>{tab === "sets" ? "Add a complete set" : tab === "parts" ? "Add individual pieces" : "Find a minifigure"}</h3>
      <small>{tab === "sets" ? "Every included piece is added to your build inventory automatically." : "Search by name, ID, theme, or color."}</small></div>
    <form onSubmit={(e)=>{e.preventDefault();search();}}><input value={q} onChange={e=>setQ(e.target.value)} placeholder={tab === "sets" ? "Search—or leave blank to browse…" : tab === "parts" ? "Search piece, color or ID…" : "Search minifigure or theme…"}/><button>{searching?"Searching…":tab==="sets"?"Browse sets":"Search"}</button></form>
    {tab==="sets"&&<div className="collection-browse-filters"><label>Theme<select value={theme} onChange={e=>setTheme(e.target.value)}><option value="">All themes</option>{themes.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>Release year<select value={year} onChange={e=>setYear(e.target.value)}><option value="">Any year</option>{Array.from({length:27},(_,i)=>new Date().getFullYear()-i).map(y=><option key={y}>{y}</option>)}</select></label><button onClick={search}>Show matching sets</button></div>}
    {results.length>0 && <div className="collection-search-results">{results.map(item=><button key={`${item.type}-${item.id}`} onClick={()=>add(item)}>
      <span>{item.image_url?<img src={item.image_url} alt=""/>:"◇"}</span><div><strong>{item.title}</strong><small>{item.subtitle}{item.meta?.year_released?` · ${item.meta.year_released}`:""}</small></div><b>+ Add</b>
    </button>)}</div>}
    {hasSearched&&!searching&&results.length===0&&<div className="collection-no-results"><strong>{tab==="sets"?"No sets match those filters.":"No matching items found."}</strong><span>{tab==="sets"?"Try another year, choose “Any year,” or browse a different theme.":"Try a broader name, ID, theme, or color."}</span></div>}
  </div>;
}

export function AccountPage({ me }: { me: Me }) {
  const [tab,setTab] = useState<Tab>("overview");
  const [summary,setSummary] = useState<Summary|null>(null);
  const [sets,setSets] = useState<OwnedSet[]>([]);
  const [parts,setParts] = useState<OwnedPart[]>([]);
  const [figs,setFigs] = useState<OwnedFig[]>([]);
  const [loading,setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [a,b,c,d] = await Promise.all([
        api.get<Summary>(ENDPOINTS.collectionSummary), api.get<OwnedSet[]>(ENDPOINTS.collectionSets),
        api.get<OwnedPart[]>(ENDPOINTS.collectionParts), api.get<OwnedFig[]>(ENDPOINTS.collectionMinifigs),
      ]);
      setSummary(a.data); setSets(b.data); setParts(c.data); setFigs(d.data);
    } finally { setLoading(false); }
  }
  useEffect(()=>{load();},[]);

  async function remove(endpoint:string,id:number) { await api.delete(`${endpoint}${id}/`); await load(); }
  async function toggleSetLock(row:OwnedSet) {
    await api.patch(`${ENDPOINTS.collectionSets}${row.id}/`,{is_locked:!row.is_locked,quantity:row.quantity});
    await load();
  }
  const rareFigs = useMemo(()=>figs.filter(x=>["rare","epic","legendary"].includes(x.minifig.rarity)).length,[figs]);
  const recent = [...sets.map(x=>({kind:"Set",name:x.set.name,image:x.set.image_url})),...figs.map(x=>({kind:"Minifigure",name:x.minifig.name,image:x.minifig.image_url}))].slice(0,6);

  return <main className="collection-page">
    <section className="collection-hero"><div className="collection-wrap">
      <div><p className="collection-eyebrow">YOUR BRICKWISE COLLECTION</p><h1>Welcome back, <em>{me.username}</em>.</h1><p>One place for every set, piece, and minifigure you own—and every new build they unlock.</p></div>
      <div className="collection-level"><span>COLLECTOR PROFILE</span><strong>{summary?.piece_count ? "Master Builder" : "New Collector"}</strong><small>{summary?.piece_count?.toLocaleString()||0} pieces cataloged</small></div>
    </div></section>

    <nav className="collection-tabs"><div className="collection-wrap">{tabs.map(t=><button key={t.id} className={tab===t.id?"active":""} onClick={()=>setTab(t.id)}>{t.label}<span>{t.id==="sets"?summary?.set_count:t.id==="parts"?summary?.loose_piece_count:t.id==="minifigs"?summary?.minifig_count:null}</span></button>)}</div></nav>

    <section className="collection-wrap collection-content">
      {loading && !summary ? <div className="collection-loading">Opening your collection…</div> : null}
      {tab==="overview" && <div className="collection-overview">
        <div className="collection-stats">
          <article className="blue"><span>SETS OWNED</span><strong>{summary?.set_count||0}</strong><small>{summary?.unique_sets||0} unique builds</small></article>
          <article className="gold"><span>TOTAL PIECES</span><strong>{summary?.piece_count?.toLocaleString()||0}</strong><small>Ready for matching</small></article>
          <article className="violet"><span>MINIFIGURES</span><strong>{summary?.minifig_count||0}</strong><small>{rareFigs} rare or better</small></article>
          <article className="green"><span>ESTIMATED COLLECTION VALUE</span><strong>{money(summary?.total_value||0)}</strong><small>Sets, loose pieces & figures</small></article>
        </div>
        <div className="collection-welcome">
          <div><p className="collection-eyebrow">YOUR COLLECTION, WORKING SMARTER</p><h2>Every item you add unlocks more possibilities.</h2><p>Add a complete set and all of its pieces immediately count toward other builds. Add loose finds one by one. We’ll keep the math out of your way.</p><button onClick={()=>setTab("sets")}>{summary?.set_count ? "Add another set →" : "Add your first set →"}</button></div>
          <div className="collection-orbit"><span>{summary?.piece_count?.toLocaleString()||0}<small>PIECES</small></span><i/><i/><i/></div>
        </div>
        <div className="collection-recent"><div><p className="collection-eyebrow">RECENTLY COLLECTED</p><h2>Your latest finds</h2></div>{recent.length?<div className="recent-grid">{recent.map((r,i)=><article key={i}><div>{r.image?<img src={r.image} alt=""/>:"◇"}</div><small>{r.kind}</small><strong>{r.name}</strong></article>)}</div>:<p className="empty-copy">Your display shelf is waiting. Add a set or minifigure to get started.</p>}</div>
      </div>}

      {tab==="sets" && <><AddPanel tab="sets" onAdded={load}/><div className="collection-section-head"><div><p>COMPLETE SETS</p><h2>My build library</h2></div><span>{money(summary?.set_value||0)} estimated value</span></div><div className="collection-lock-guide"><span>🔒</span><div><strong>What does locking a set do?</strong><p>You still own it and it stays in your collection and estimated value. Locking simply tells Brickwise that you want to keep it assembled, so its pieces will not count toward progress on new builds. Unlock it whenever you are willing to reuse those pieces.</p></div></div><div className="owned-set-grid">{sets.map(row=><article className={row.is_locked?"locked-set":""} key={row.id}><div>{row.set.image_url?<img src={row.set.image_url} alt={row.set.name}/>:"◇"}<b>×{row.quantity}</b>{row.is_locked&&<span className="set-lock-badge">🔒 Kept assembled</span>}</div><small>{row.set.theme_name} · {row.set.year_released||"Year unknown"} · {row.set.set_num}</small><h3>{row.set.name}</h3><p>{row.is_locked?"Pieces excluded from new-build progress":<><strong>{row.contributed_piece_count.toLocaleString()}</strong> pieces available for new builds</>} · Estimated value <strong>{money(row.set.bricklink_value)}</strong></p><div className="owned-set-actions"><button className="lock-action" title={row.is_locked?"Allow this set's pieces to count toward new builds":"Keep this set assembled and exclude its pieces from new builds"} onClick={()=>toggleSetLock(row)}>{row.is_locked?"Unlock pieces":"🔒 Keep assembled"}</button><button onClick={()=>remove(ENDPOINTS.collectionSets,row.id)}>Remove</button></div></article>)}</div>{!sets.length&&<p className="empty-copy">No sets yet. Browse by theme or year above to find your first build.</p>}</>}

      {tab==="parts" && <><AddPanel tab="parts" onAdded={load}/><div className="collection-section-head"><div><p>LOOSE PIECES</p><h2>Individual inventory</h2></div><span>{summary?.loose_piece_count||0} pieces · {money(summary?.loose_parts_value||0)} estimated value</span></div><div className="owned-parts-list">{parts.map(row=><article key={row.id}><div>{row.part_color.image_url?<img src={row.part_color.image_url} alt=""/>:"◇"}</div><p><strong>{row.part_color.name}</strong><small>{row.part_color.part_id} · {row.part_color.color_name}</small></p><b>×{row.quantity}</b><button onClick={()=>remove(ENDPOINTS.collectionParts,row.id)}>Remove</button></article>)}</div>{!parts.length&&<p className="empty-copy">No loose pieces yet. Add individual finds with the search above.</p>}</>}

      {tab==="minifigs" && <><AddPanel tab="minifigs" onAdded={load}/><div className="collection-section-head"><div><p>THE MINIFIGURE VAULT</p><h2>Your collectible gallery</h2></div><span>{money(summary?.minifig_value||0)} estimated value</span></div><div className="fig-vault">{figs.map(row=><article className={`fig-card ${row.minifig.rarity}`} key={row.id}><div className="fig-shine"/><span className="rarity">{row.minifig.rarity}</span><div className="fig-image">{row.minifig.image_url?<img src={row.minifig.image_url} alt=""/>:"♟"}</div><small>{row.minifig.theme_name} · {row.minifig.bricklink_id}</small><h3>{row.minifig.name}</h3><div className="fig-value"><span>ESTIMATED VALUE</span><strong>{money(row.minifig.market_value)}</strong></div><button onClick={()=>remove(ENDPOINTS.collectionMinifigs,row.id)}>Remove from vault</button></article>)}</div>{!figs.length&&<p className="empty-copy">Your vault is empty. Find a minifigure above and start collecting.</p>}</>}
    </section>
  </main>;
}
