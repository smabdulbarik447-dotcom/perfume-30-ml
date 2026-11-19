import Link from "next/link";
import { dhakaDay, money, inRange } from "@/lib/dateRange";

const DAY = 864e5;
const isSale = (o) => ["confirmed", "shipped", "delivered"].includes(o.status);
const sum = (l) => l.reduce((t, o) => t + o.total, 0);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
const AREA = { inside: "ঢাকার ভেতরে", outside: "ঢাকার বাইরে" };

// Number er shuru dekhe operator (BD)
const OPERATORS = [
  { id: "gp", name: "গ্রামীণফোন", re: /^01[37]/, c: "#0ea5e9" },
  { id: "robi", name: "রবি", re: /^018/, c: "#e11d48" },
  { id: "bl", name: "বাংলালিংক", re: /^01[49]/, c: "#f97316" },
  { id: "airtel", name: "এয়ারটেল", re: /^016/, c: "#dc2626" },
  { id: "tt", name: "টেলিটক", re: /^015/, c: "#16a34a" },
];

function Head({ title, sub, link }) {
  return (
    <div className="panel-head">
      <div>
        <h3>{title}</h3>
        <small>{sub}</small>
      </div>
      {link}
    </div>
  );
}

/** Dashboard er notun 10 ta panel — shob orders/incomplete/review theke hishab */
export default function ExtraPanels({ orders, inR, range, incAll, reviews }) {
  const today = dhakaDay(Date.now());
  const dayOf = (o) => dhakaDay(o.created_at);

  // 1. আজকের টার্গেট: shesh 7 diner gor × 1.2
  const last7 = Array.from({ length: 7 }, (_, i) => dhakaDay(Date.now() - (i + 1) * DAY));
  const avg7 = last7.reduce((t, d) => t + orders.filter((o) => dayOf(o) === d).length, 0) / 7;
  const target = Math.max(3, Math.ceil(avg7 * 1.2));
  const todayN = orders.filter((o) => dayOf(o) === today).length;
  const targetPct = Math.min(100, Math.round((todayN / target) * 100));

  // 2. এই সপ্তাহ vs গত সপ্তাহ
  const wk = (from, to) => orders.filter((o) => { const t = Date.now() - new Date(o.created_at).getTime(); return t >= from * DAY && t < to * DAY; });
  const thisW = wk(0, 7);
  const prevW = wk(7, 14);
  const stat = (l) => {
    const sale = l.filter(isSale);
    const cancel = l.filter((o) => o.status === "cancelled").length;
    return { n: l.length, sales: sum(sale), conf: pct(sale.length, sale.length + cancel) ?? 0, ok: l.filter((o) => o.status === "delivered").length };
  };
  const A = stat(thisW);
  const B = stat(prevW);
  const weekRows = [
    { label: "অর্ডার", a: A.n, b: B.n, f: (v) => `${v}টি` },
    { label: "কনফার্মড বিক্রি", a: A.sales, b: B.sales, f: money },
    { label: "কনফার্ম রেট", a: A.conf, b: B.conf, f: (v) => `${v}%` },
    { label: "ডেলিভারড", a: A.ok, b: B.ok, f: (v) => `${v}টি` },
  ];

  // 3. রিভিউ সারাংশ
  const shown = reviews.filter((r) => r.approved);
  const revAvg = reviews.length ? reviews.reduce((t, r) => t + r.rating, 0) / reviews.length : 0;
  const starRows = [5, 4, 3, 2, 1].map((s) => ({ s, n: reviews.filter((r) => r.rating === s).length }));
  const latest = reviews.find((r) => r.text);

  // 4. নতুন vs ফেরত কাস্টমার (beche neya shomoy)
  const firstAt = {};
  for (const o of orders) {
    const t = new Date(o.created_at).getTime();
    if (!firstAt[o.phone] || t < firstAt[o.phone]) firstAt[o.phone] = t;
  }
  const repeatN = inR.filter((o) => new Date(o.created_at).getTime() > firstAt[o.phone]).length;
  const newN = inR.length - repeatN;
  const repPct = pct(repeatN, inR.length) ?? 0;

  // 5. ঢাকার ভেতর vs বাইরে
  const areaRows = ["inside", "outside"].map((id) => {
    const l = inR.filter((o) => o.area === id);
    const ok = l.filter((o) => o.status === "delivered").length;
    const bad = l.filter((o) => o.status === "returned").length;
    return { id, n: l.length, sales: sum(l.filter(isSale)), rate: pct(ok, ok + bad) };
  });
  const areaMax = Math.max(1, ...areaRows.map((r) => r.n));

  // 6. মোবাইল অপারেটর
  const opRows = OPERATORS.map((op) => ({ ...op, n: inR.filter((o) => op.re.test(o.phone)).length })).sort((a, b) => b.n - a.n);
  const opMax = Math.max(1, ...opRows.map((r) => r.n));

  // 7. পণ্য অনুযায়ী রিটার্ন
  const prodMap = {};
  for (const o of inR) {
    if (o.status !== "delivered" && o.status !== "returned") continue;
    const r = (prodMap[o.product || "—"] ||= { ok: 0, bad: 0 });
    o.status === "delivered" ? r.ok++ : r.bad++;
  }
  const prodRows = Object.entries(prodMap).map(([name, r]) => ({ name, ...r, rate: pct(r.bad, r.ok + r.bad) })).sort((a, b) => b.ok + b.bad - (a.ok + a.bad)).slice(0, 6);

  // 8. অসম্পূর্ণ থেকে উদ্ধার
  const saved = inR.filter((o) => String(o.note || "").startsWith("অসম্পূর্ণ থেকে")).length;
  const leftInc = incAll.filter((r) => inRange(r.updated_at, range)).length;
  const recPct = pct(saved, saved + leftInc) ?? 0;

  // 9. অর্ডারের দামের ভাগ
  const totals = inR.map((o) => o.total).sort((a, b) => a - b);
  const median = totals.length ? totals[Math.floor(totals.length / 2)] : 0;
  const BUCKETS = [
    { label: "৳১,০০০ এর কম", f: (v) => v < 1000 },
    { label: "৳১,০০০–১,৪৯৯", f: (v) => v >= 1000 && v < 1500 },
    { label: "৳১,৫০০–২,৪৯৯", f: (v) => v >= 1500 && v < 2500 },
    { label: "৳২,৫০০+", f: (v) => v >= 2500 },
  ].map((b) => ({ ...b, n: totals.filter(b.f).length }));
  const bMax = Math.max(1, ...BUCKETS.map((b) => b.n));
  const multi = inR.filter((o) => o.qty > 1).length;

  // 10. ডেলিভারি সাকসেস ট্রেন্ড (shesh 8 shoptah, order er tarikh dhore)
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const l = wk((7 - i) * 7, (8 - i) * 7);
    const ok = l.filter((o) => o.status === "delivered").length;
    const bad = l.filter((o) => o.status === "returned").length;
    const start = new Date(Date.now() - (8 - i) * 7 * DAY + DAY);
    return { label: start.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Dhaka" }), ok, bad, rate: pct(ok, ok + bad) };
  });

  const trend = (a, b) => (a === b ? <em className="x-eq">=</em> : a > b ? <em className="x-up">▲</em> : <em className="x-down">▼</em>);

  return (
    <>
      <section className="dash-grid trio">
        <div className="panel">
          <Head title="আজকের টার্গেট 🎯" sub={`শেষ ৭ দিনের গড় ${avg7.toFixed(1)}টি — তার চেয়ে ২০% বেশি`} />
          <div className="x-target">
            <div className="x-ring" style={{ "--p": targetPct }}>
              <div><b>{todayN}</b><small>/ {target}টি</small></div>
            </div>
            <p>
              {todayN >= target ? "🎉 আজকের টার্গেট পূরণ! দারুণ!" : `টার্গেট ছুঁতে আর ${target - todayN}টি অর্ডার`}
            </p>
          </div>
        </div>

        <div className="panel">
          <Head title="এই সপ্তাহ বনাম গত সপ্তাহ 📊" sub="শেষ ৭ দিন বনাম তার আগের ৭ দিন" />
          <ul className="x-week">
            {weekRows.map((r) => (
              <li key={r.label}>
                <small>{r.label}</small>
                <b>{r.f(r.a)} {trend(r.a, r.b)}</b>
                <span>আগে {r.f(r.b)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <Head
            title="কাস্টমার রিভিউ ⭐"
            sub={reviews.length ? `${reviews.length}টি রিভিউ • সাইটে ${shown.length}টি` : "এখনো রিভিউ আসেনি"}
            link={<Link href="/admin/reviews" className="view-all">সব →</Link>}
          />
          {reviews.length === 0 ? (
            <p className="adm-muted">ডেলিভারড কাস্টমারদের রিভিউ লিংক পাঠান — রিভিউ পেজে লিস্ট আছে</p>
          ) : (
            <div className="x-rev">
              <div className="x-rev-avg"><b>{revAvg.toFixed(1)}</b><span>{"★".repeat(Math.round(revAvg))}{"☆".repeat(5 - Math.round(revAvg))}</span></div>
              <ul>
                {starRows.map((r) => (
                  <li key={r.s}><small>{r.s}★</small><span><i style={{ width: `${(r.n / reviews.length) * 100}%` }} /></span><small>{r.n}</small></li>
                ))}
              </ul>
              {latest && <p className="x-rev-q">“{latest.text.slice(0, 90)}” — {latest.name}</p>}
            </div>
          )}
        </div>
      </section>

      <section className="dash-grid trio">
        <div className="panel">
          <Head title="নতুন বনাম ফেরত কাস্টমার 🔁" sub={`${range.label} • কতজন আবার কিনতে এসেছেন`} />
          <div className="x-split">
            <div className="x-donut" style={{ "--p": repPct }}><div><b>{repPct}%</b><small>ফেরত</small></div></div>
            <ul>
              <li><i className="c-new" /> নতুন কাস্টমার <b>{newN}</b></li>
              <li><i className="c-rep" /> আবার কিনেছেন <b>{repeatN}</b></li>
            </ul>
          </div>
        </div>

        <div className="panel">
          <Head title="ঢাকার ভেতর বনাম বাইরে 🏙️" sub={`${range.label} • অর্ডার আর ডেলিভারি সাকসেস`} />
          <ul className="x-bars">
            {areaRows.map((r) => (
              <li key={r.id}>
                <div className="x-bar-top"><b>{AREA[r.id]}</b><small>{r.n}টি • {money(r.sales)}</small></div>
                <span className={`x-bar a-${r.id}`}><i style={{ width: `${(r.n / areaMax) * 100}%` }} /></span>
                <small className="x-sub">ডেলিভারি সাকসেস {r.rate === null ? "—" : `${r.rate}%`}</small>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <Head title="মোবাইল অপারেটর 📱" sub={`${range.label} • কাস্টমাররা কোন সিম ব্যবহার করেন`} />
          <ul className="x-bars">
            {opRows.map((r) => (
              <li key={r.id}>
                <div className="x-bar-top"><b>{r.name}</b><small>{r.n}টি • {pct(r.n, inR.length) ?? 0}%</small></div>
                <span className="x-bar"><i style={{ width: `${(r.n / opMax) * 100}%`, background: r.c }} /></span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="dash-grid trio">
        <div className="panel">
          <Head title="পণ্য অনুযায়ী রিটার্ন ↩️" sub={`${range.label} • কোন পণ্য বেশি ফেরত আসে`} />
          {prodRows.length === 0 ? (
            <p className="adm-muted">এই সময়ে ডেলিভারড/রিটার্ন অর্ডার নেই</p>
          ) : (
            <ul className="x-bars">
              {prodRows.map((r) => (
                <li key={r.name}>
                  <div className="x-bar-top"><b className="x-ellipsis">{r.name}</b><small>✅ {r.ok} • ↩️ {r.bad}</small></div>
                  <span className="x-bar"><i style={{ width: `${r.rate}%`, background: r.rate >= 25 ? "#e11d48" : r.rate >= 10 ? "#f59e0b" : "#16a34a" }} /></span>
                  <small className="x-sub">রিটার্ন {r.rate}%</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <Head title="অসম্পূর্ণ থেকে উদ্ধার 🛟" sub={`${range.label} • ফর্ম ছেড়ে যাওয়া কাস্টমার থেকে অর্ডার`} link={<Link href="/admin/incomplete" className="view-all">দেখুন →</Link>} />
          <div className="x-split">
            <div className="x-donut rec" style={{ "--p": recPct }}><div><b>{recPct}%</b><small>উদ্ধার</small></div></div>
            <ul>
              <li><i className="c-rep" /> অর্ডারে বদলেছে <b>{saved}</b></li>
              <li><i className="c-new" /> এখনো অপেক্ষায় <b>{leftInc}</b></li>
            </ul>
          </div>
        </div>

        <div className="panel">
          <Head title="অর্ডারের দামের ভাগ 💵" sub={`${range.label} • মাঝামাঝি ${money(median)} • ${multi}টি অর্ডারে একাধিক প্যাকেজ`} />
          <ul className="x-bars">
            {BUCKETS.map((b) => (
              <li key={b.label}>
                <div className="x-bar-top"><b>{b.label}</b><small>{b.n}টি</small></div>
                <span className="x-bar"><i style={{ width: `${(b.n / bMax) * 100}%`, background: "linear-gradient(90deg, #a78bfa, #ec4899)" }} /></span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="dash-grid one-col">
        <div className="panel">
          <Head title="ডেলিভারি সাকসেস ট্রেন্ড 📈" sub="শেষ ৮ সপ্তাহ • প্রতি সপ্তাহের অর্ডারের মধ্যে কত % ডেলিভারড (রিটার্নের তুলনায়)" />
          <div className="x-trend">
            {weeks.map((w) => (
              <div key={w.label} className="x-trend-col" title={`ডেলিভারড ${w.ok} • রিটার্ন ${w.bad}`}>
                <small className="x-trend-v">{w.rate === null ? "—" : `${w.rate}%`}</small>
                <span><i style={{ height: `${w.rate ?? 0}%`, background: w.rate === null ? "#e5e7eb" : w.rate >= 80 ? "#16a34a" : w.rate >= 60 ? "#f59e0b" : "#e11d48" }} /></span>
                <small>{w.label}</small>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
