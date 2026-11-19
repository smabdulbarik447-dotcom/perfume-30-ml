import { districtLatLng } from "@/lib/districts";

// Bangladesh er mota-muti shimana (akkhangsho, drighangsho) — hubohu na, bojhar moto
const OUTLINE = [
  [26.45, 88.08], [26.63, 88.43], [26.3, 88.7], [26.25, 89], [26.3, 89.3], [26.1, 89.6], [25.95, 89.85], [25.3, 89.85],
  [25.18, 90.6], [25.28, 92.05], [24.85, 92.45], [24.2, 92.25], [24.05, 91.9], [23.65, 91.45], [23.3, 91.35], [23.05, 91.55],
  [22.95, 91.75], [23.45, 92.05], [23.65, 92.3], [23.1, 92.45], [22.4, 92.65], [21.6, 92.6], [21.1, 92.3], [20.75, 92.3],
  [21.5, 91.95], [22.25, 91.6], [22.75, 91.3], [22.35, 90.95], [21.9, 90.6], [22.05, 90.15], [21.75, 89.9], [21.65, 89.05],
  [22.15, 89], [22.9, 88.95], [23.25, 88.75], [23.65, 88.55], [24.2, 88.7], [24.3, 88.1], [24.85, 88.05], [25.05, 88.4],
  [25.28, 88.95], [25.55, 88.6], [25.75, 88.1], [26.05, 88.2], [26.25, 88.05],
];
const X = (lng) => (lng - 87.9) * 100;
const Y = (lat) => (26.75 - lat) * 110;
const PATH = OUTLINE.map(([la, lo], i) => `${i ? "L" : "M"}${X(lo).toFixed(1)},${Y(la).toFixed(1)}`).join("") + "Z";

/** rows: [[jela, { n, ok, bad }]] — bubble boro = beshi order; rong = রিটার্ন er har */
export default function OrderMap({ rows, label }) {
  const pts = rows
    .map(([name, r]) => ({ name, ...r, at: districtLatLng(name) }))
    .filter((p) => p.at)
    .sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...pts.map((p) => p.n));
  const total = pts.reduce((t, p) => t + p.n, 0);
  const tone = (p) => {
    const done = p.ok + p.bad;
    if (!done) return "new";
    const rate = p.ok / done;
    return rate >= 0.8 ? "good" : rate >= 0.6 ? "mid" : "bad";
  };

  return (
    <div className="omap">
      <svg viewBox="0 0 490 680" className="omap-svg" role="img" aria-label="জেলা অনুযায়ী অর্ডারের ম্যাপ">
        <defs>
          <linearGradient id="omap-land" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ede9fe" />
            <stop offset="1" stopColor="#fce7f3" />
          </linearGradient>
        </defs>
        <path d={PATH} className="omap-land" fill="url(#omap-land)" />
        {pts.map((p, i) => {
          const r = 5 + Math.sqrt(p.n / max) * 26;
          return (
            <g key={p.name} className={`omap-pt t-${tone(p)} ${i === 0 ? "top" : ""}`} transform={`translate(${X(p.at[1]).toFixed(1)},${Y(p.at[0]).toFixed(1)})`}>
              <title>{`${p.name}: ${p.n}টি অর্ডার • ডেলিভারড ${p.ok} • রিটার্ন ${p.bad}`}</title>
              {i < 3 && <circle r={r} className="omap-ping" />}
              <circle r={r} className="omap-dot" />
              {(i < 6 || p.n / max > 0.3) && (
                <text y={-r - 5} className="omap-label">{p.name} {p.n}</text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="omap-side">
        <small className="adm-muted">{label} • {pts.length}টি জেলা • {total}টি অর্ডার</small>
        <ul className="omap-legend">
          <li><i className="t-good" /> রিসিভ ৮০%+</li>
          <li><i className="t-mid" /> ৬০–৭৯%</li>
          <li><i className="t-bad" /> ৬০% এর কম</li>
          <li><i className="t-new" /> এখনো ডেলিভারি হয়নি</li>
        </ul>
        <p className="omap-hint">বড় বৃত্ত = বেশি অর্ডার • উপরের ৩টা জেলা ঢেউ দিচ্ছে • বৃত্তের উপর মাউস রাখলে হিসাব</p>
        {pts.length === 0 && <p className="adm-muted">এই সময়ে ঠিকানা থেকে কোনো জেলা পাওয়া যায়নি</p>}
      </div>
    </div>
  );
}
