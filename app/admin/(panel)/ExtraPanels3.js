import Link from "next/link";
import { dhakaDay, money } from "@/lib/dateRange";
import { orderDelivery } from "@/lib/store";

const DAY = 864e5;
const isSale = (o) => ["confirmed", "shipped", "delivered"].includes(o.status);
const bn = (n) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

// Bangladesh er songshodhito Bangla calendar (2019 theke): 14 April = ১ বৈশাখ; prothom 6 mash 31 din, ফাল্গুন 29 (lip year e 30), baki 30
const BN_MONTHS = ["বৈশাখ", "জ্যৈষ্ঠ", "আষাঢ়", "শ্রাবণ", "ভাদ্র", "আশ্বিন", "কার্তিক", "অগ্রহায়ণ", "পৌষ", "মাঘ", "ফাল্গুন", "চৈত্র"];
const BN_SEASON = ["গ্রীষ্ম", "গ্রীষ্ম", "বর্ষা", "বর্ষা", "শরৎ", "শরৎ", "হেমন্ত", "হেমন্ত", "শীত", "শীত", "বসন্ত", "বসন্ত"];
const BN_WEEK = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
function banglaDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = Date.UTC(y, m - 1, d);
  const startYear = date >= Date.UTC(y, 3, 14) ? y : y - 1;
  let left = Math.round((date - Date.UTC(startYear, 3, 14)) / DAY);
  const leap = ((startYear + 1) % 4 === 0 && (startYear + 1) % 100 !== 0) || (startYear + 1) % 400 === 0;
  const lens = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, leap ? 30 : 29, 30];
  let mi = 0;
  while (left >= lens[mi]) { left -= lens[mi]; mi++; }
  return { day: left + 1, month: BN_MONTHS[mi], year: startYear - 593, season: BN_SEASON[mi], weekday: BN_WEEK[new Date(date).getUTCDay()] };
}

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

/** Dashboard er aro 6 ta panel */
export default function ExtraPanels3({ orders, inR, range, products, settings }) {
  const now = Date.now();
  const today = dhakaDay(now);

  // 1. স্টক কত দিন চলবে — shesh 14 diner gor bikri diye
  const last14 = orders.filter((o) => now - new Date(o.created_at).getTime() < 14 * DAY && o.status !== "cancelled");
  const runway = products
    .filter((p) => p.active !== false)
    .map((p) => {
      const perDay = last14.filter((o) => o.product === p.name).reduce((t, o) => t + o.qty, 0) / 14;
      return { name: p.name, stock: p.stock, perDay, days: perDay ? Math.floor(p.stock / perDay) : null };
    })
    .sort((a, b) => (a.days ?? 1e9) - (b.days ?? 1e9));

  // 2. ডেলিভারি চার্জ (beche neya shomoy, কনফার্মড/শিপড/ডেলিভারড)
  const sold = inR.filter(isSale);
  const charged = sold.reduce((t, o) => t + orderDelivery(settings, products, o), 0);
  const freeOnes = sold.filter((o) => orderDelivery(settings, products, o) === 0);
  const fullCharge = (o) => (o.area === "inside" ? Number(settings.delivery_inside) : Number(settings.delivery_outside)) || 0;
  const freeGiven = freeOnes.reduce((t, o) => t + fullCharge(o), 0);

  // 3. কাস্টমার কত দিন পর আবার কেনে (prothom → ditiyo order)
  const byPhone = {};
  for (const o of orders) (byPhone[o.phone] ||= []).push(new Date(o.created_at).getTime());
  const gaps = Object.values(byPhone)
    .filter((l) => l.length > 1)
    .map((l) => { l.sort((a, b) => a - b); return (l[1] - l[0]) / DAY; })
    .filter((g) => g >= 1); // ek dine duibar = bhule duibar, gona hoy na
  const avgGap = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;
  const GAPB = [
    { label: "১ সপ্তাহের মধ্যে", f: (g) => g < 7 },
    { label: "১–৪ সপ্তাহ", f: (g) => g >= 7 && g < 28 },
    { label: "১–২ মাস", f: (g) => g >= 28 && g < 60 },
    { label: "২ মাসের বেশি", f: (g) => g >= 60 },
  ].map((b) => ({ ...b, n: gaps.filter(b.f).length }));
  const gapMax = Math.max(1, ...GAPB.map((b) => b.n));

  // 4. গড় অর্ডারের দাম — shesh 8 shoptah
  const aov = Array.from({ length: 8 }, (_, i) => {
    const l = orders.filter((o) => { const a = now - new Date(o.created_at).getTime(); return a >= (7 - i) * 7 * DAY && a < (8 - i) * 7 * DAY; });
    return { label: new Date(now - (8 - i) * 7 * DAY + DAY).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Dhaka" }), v: l.length ? Math.round(l.reduce((t, o) => t + o.total, 0) / l.length) : 0 };
  });
  const aovMax = Math.max(1, ...aov.map((w) => w.v));

  // 5. অর্ডার মাইলস্টোন
  const total = orders.length;
  const STEPS = [10, 25, 50, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000];
  const next = STEPS.find((s) => s > total) || Math.ceil((total + 1) / 5000) * 5000;
  const prevStep = [...STEPS].reverse().find((s) => s <= total) || 0;
  const perDay = orders.filter((o) => now - new Date(o.created_at).getTime() < 14 * DAY).length / 14;
  const eta = perDay ? Math.ceil((next - total) / perDay) : null;

  // 6. আজকের বাংলা তারিখ
  const bd = banglaDate(today);

  return (
    <>
      <section className="dash-grid trio">
        <div className="panel bn-date">
          <Head title="আজকের দিন 🌾" sub={`${bd.season}কাল`} />
          <div className="w-date">
            <b>{bn(bd.day)}</b>
            <div>
              <span>{bd.month} {bn(bd.year)}</span>
              <small>{bd.weekday} • {new Date(now).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" })}</small>
            </div>
          </div>
        </div>

        <div className="panel">
          <Head title="অর্ডার মাইলস্টোন 🚩" sub={`এখন পর্যন্ত মোট ${total}টি অর্ডার`} />
          <div className="w-mile">
            <div className="w-mile-top"><small>{prevStep}</small><b>{next}তম অর্ডার</b><small>{next}</small></div>
            <span className="w-mile-bar"><i style={{ width: `${Math.round(((total - prevStep) / (next - prevStep)) * 100)}%` }} /></span>
            <p>🎯 আর <b>{next - total}টি</b> অর্ডার{eta !== null ? ` — এখনকার গতিতে প্রায় ${eta} দিনে` : ""}</p>
          </div>
        </div>

        <div className="panel">
          <Head title="স্টক কত দিন চলবে 📦" sub="শেষ ১৪ দিনের গড় বিক্রি ধরে" link={<Link href="/admin/products" className="view-all">পণ্য →</Link>} />
          <ul className="w-stock">
            {runway.map((p) => (
              <li key={p.name} className={p.days !== null && p.days <= 7 ? "low" : ""}>
                <div><b>{p.name}</b><small>স্টক {p.stock} • দিনে ~{p.perDay.toFixed(1)}টি</small></div>
                <em>{p.days === null ? "বিক্রি নেই" : p.days <= 0 ? "শেষ!" : `${p.days} দিন`}</em>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="dash-grid trio">
        <div className="panel">
          <Head title="ডেলিভারি চার্জ 🚚" sub={`${range.label} • কনফার্মড অর্ডার থেকে`} />
          <div className="w-del">
            <div><small>কাস্টমার থেকে নেওয়া</small><b>{money(charged)}</b></div>
            <div><small>ফ্রি ডেলিভারি দিয়েছেন</small><b>{freeOnes.length}টি</b></div>
            <div><small>ফ্রি তে ছেড়ে দেওয়া (আনুমানিক)</small><b className="neg">{money(freeGiven)}</b></div>
          </div>
        </div>

        <div className="panel">
          <Head title="কত দিন পর আবার কেনে 🔄" sub={avgGap === null ? "এখনো কেউ দ্বিতীয়বার কেনেনি" : `গড়ে ${avgGap} দিন পর • ${gaps.length} জন`} />
          <ul className="x-bars">
            {GAPB.map((b) => (
              <li key={b.label}>
                <div className="x-bar-top"><b>{b.label}</b><small>{b.n} জন</small></div>
                <span className="x-bar"><i style={{ width: `${(b.n / gapMax) * 100}%`, background: "linear-gradient(90deg, #14b8a6, #6366f1)" }} /></span>
              </li>
            ))}
          </ul>
          {avgGap !== null && <p className="y-note">💡 ডেলিভারির {Math.max(7, avgGap - 5)} দিন পর “আবার কেনার সময়” লিস্ট থেকে মেসেজ দিন</p>}
        </div>

        <div className="panel">
          <Head title="গড় অর্ডারের দাম 💹" sub="শেষ ৮ সপ্তাহ • প্রতি অর্ডারে গড়ে কত টাকা" />
          <div className="x-trend w-aov">
            {aov.map((w) => (
              <div key={w.label} className="x-trend-col">
                <small className="x-trend-v">{w.v ? `৳${w.v}` : "—"}</small>
                <span><i style={{ height: `${(w.v / aovMax) * 100}%`, background: "linear-gradient(180deg, #f472b6, #8b5cf6)" }} /></span>
                <small>{w.label}</small>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
