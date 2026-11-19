import Link from "next/link";
import { dhakaDay, dhakaHour, money } from "@/lib/dateRange";
import { orderCode } from "@/lib/db";

const DAY = 864e5;
const HOUR = 36e5;
const isSale = (o) => ["confirmed", "shipped", "delivered"].includes(o.status);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
const hourOf = dhakaHour;
const weekdayOf = (d) => new Date(new Date(d).getTime() + 6 * HOUR).getUTCDay();
const WEEK = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
const ampm = (h) => `${h % 12 || 12}${h < 12 ? "AM" : "PM"}`;

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

/** Dashboard er aro 8 ta panel */
export default function MorePanels({ orders, inR, range, brand }) {
  const now = Date.now();
  const today = dhakaDay(now);
  const age = (o) => now - new Date(o.created_at).getTime();

  // 1. আজকের পূর্বাভাস: ager eki bar (shudhu ager din gulo) er gor + kon ghontay beshi
  const wd = weekdayOf(now);
  const sameDays = [...new Set(orders.filter((o) => weekdayOf(o.created_at) === wd && dhakaDay(o.created_at) !== today).map((o) => dhakaDay(o.created_at)))];
  const sameOrders = orders.filter((o) => sameDays.includes(dhakaDay(o.created_at)));
  const expect = sameDays.length ? Math.round(sameOrders.length / sameDays.length) : null;
  const hours = Array.from({ length: 24 }, (_, h) => sameOrders.filter((o) => hourOf(o.created_at) === h).length);
  const peak = hours.indexOf(Math.max(...hours));
  const todayN = orders.filter((o) => dhakaDay(o.created_at) === today).length;

  // 2. পেন্ডিং কতক্ষণ ধরে
  const pending = orders.filter((o) => o.status === "pending");
  const AGES = [
    { label: "১ ঘণ্টার কম", f: (a) => a < HOUR, c: "#16a34a" },
    { label: "১–৬ ঘণ্টা", f: (a) => a >= HOUR && a < 6 * HOUR, c: "#84cc16" },
    { label: "৬–২৪ ঘণ্টা", f: (a) => a >= 6 * HOUR && a < DAY, c: "#f59e0b" },
    { label: "১ দিনের বেশি", f: (a) => a >= DAY, c: "#e11d48" },
  ].map((b) => ({ ...b, n: pending.filter((o) => b.f(age(o))).length }));
  const ageMax = Math.max(1, ...AGES.map((b) => b.n));

  // 3. কুরিয়ারে আটকে আছে (shipped, order er din theke)
  const shipped = orders.filter((o) => o.status === "shipped");
  const STUCK = [
    { label: "৩ দিনের কম", f: (a) => a < 3 * DAY, c: "#16a34a" },
    { label: "৩–৫ দিন", f: (a) => a >= 3 * DAY && a < 5 * DAY, c: "#f59e0b" },
    { label: "৫–১০ দিন", f: (a) => a >= 5 * DAY && a < 10 * DAY, c: "#f97316" },
    { label: "১০ দিনের বেশি", f: (a) => a >= 10 * DAY, c: "#e11d48" },
  ].map((b) => ({ ...b, n: shipped.filter((o) => b.f(age(o))).length }));
  const stuckMax = Math.max(1, ...STUCK.map((b) => b.n));

  // 4. দিন বনাম রাতের অর্ডার — kon shomoyer order beshi কনফার্ম hoy
  const PARTS = [
    { label: "☀️ সকাল (৬–১২)", f: (h) => h >= 6 && h < 12 },
    { label: "🌤️ দুপুর-বিকেল (১২–৬)", f: (h) => h >= 12 && h < 18 },
    { label: "🌆 সন্ধ্যা (৬–১০)", f: (h) => h >= 18 && h < 22 },
    { label: "🌙 রাত (১০–৬)", f: (h) => h >= 22 || h < 6 },
  ].map((p) => {
    const l = inR.filter((o) => p.f(hourOf(o.created_at)));
    const sale = l.filter(isSale).length;
    const cancel = l.filter((o) => o.status === "cancelled").length;
    return { ...p, n: l.length, conf: pct(sale, sale + cancel) };
  });
  const partMax = Math.max(1, ...PARTS.map((p) => p.n));

  // 5. মাসের শুরু / মাঝ / শেষ (beton er shomoy prova)
  const dom = (o) => Number(dhakaDay(o.created_at).slice(8, 10));
  const MONTH = [
    { label: "শুরু (১–১০)", f: (d) => d <= 10 },
    { label: "মাঝ (১১–২০)", f: (d) => d > 10 && d <= 20 },
    { label: "শেষ (২১–৩১)", f: (d) => d > 20 },
  ].map((m) => ({ ...m, n: orders.filter((o) => m.f(dom(o))).length }));
  const monthMax = Math.max(1, ...MONTH.map((m) => m.n));
  const bestPart = [...MONTH].sort((a, b) => b.n - a.n)[0];
  // Kom-pokkhe 2 mash er order na thakle shuru/majh/shesh tulona thik hoy na
  const monthsSeen = new Set(orders.map((o) => dhakaDay(o.created_at).slice(0, 7))).size;
  const WHEN = { "শুরু (১–১০)": "শুরুতে", "মাঝ (১১–২০)": "মাঝামাঝি", "শেষ (২১–৩১)": "শেষে" };

  // 6. রেকর্ড অর্ডার
  const biggest = [...orders].sort((a, b) => b.total - a.total)[0];
  const biggestQty = [...orders].sort((a, b) => b.qty - a.qty)[0];
  const todayBig = orders.filter((o) => dhakaDay(o.created_at) === today).sort((a, b) => b.total - a.total)[0];

  // 7. সন্দেহজনক IP: shesh 7 dine ek IP theke 2+ alada number
  const ipMap = {};
  for (const o of orders) {
    if (!o.ip || age(o) > 7 * DAY) continue;
    (ipMap[o.ip] ||= new Set()).add(o.phone);
  }
  const sus = Object.entries(ipMap).filter(([, s]) => s.size > 1).sort((a, b) => b[1].size - a[1].size).slice(0, 5);

  // 8. আজকের লাকি কাস্টমার — ডেলিভারড customer der theke tarikh dhore ek jon (din e ekjon, bodlay na)
  const delivered = [...new Map(orders.filter((o) => o.status === "delivered").map((o) => [o.phone, o])).values()];
  const seed = Number(today.replaceAll("-", ""));
  const lucky = delivered.length ? delivered[seed % delivered.length] : null;
  const luckyMsg = lucky
    ? `https://wa.me/88${lucky.phone}?text=${encodeURIComponent(`অভিনন্দন ${lucky.name}! 🎉 আজ আপনি ${brand} এর "লাকি কাস্টমার"! আপনার জন্য একটা ছোট্ট উপহার আছে — বিস্তারিত জানতে রিপ্লাই দিন ❤️`)}`
    : "";

  return (
    <>
      <section className="dash-grid trio">
        <div className="panel">
          <Head title="আজকের পূর্বাভাস 🔮" sub={`আগের ${sameDays.length}টা ${WEEK[wd]} দেখে${sameDays.length < 3 ? " (ডেটা কম — আন্দাজ)" : ""}`} />
          {expect === null ? (
            <p className="adm-muted">আগের {WEEK[wd]} এর হিসাব নেই</p>
          ) : (
            <div className="y-fore">
              <div><small>আজ আশা করা যায়</small><b>~{expect}টি অর্ডার</b></div>
              <div><small>সবচেয়ে বেশি আসে</small><b>{ampm(peak)}–{ampm((peak + 1) % 24)}</b></div>
              <div><small>এখন পর্যন্ত</small><b className={todayN >= expect ? "ok" : ""}>{todayN}টি {todayN >= expect ? "🎉" : ""}</b></div>
              <p>💡 {ampm(peak)} এর আগে অ্যাড চালু রাখুন আর ফোনের কাছে থাকুন</p>
            </div>
          )}
        </div>

        <div className="panel">
          <Head title="পেন্ডিং কতক্ষণ ধরে ⏱️" sub={`এখন ${pending.length}টি কলের অপেক্ষায় — দেরি হলে কাস্টমার মত বদলায়`} link={<Link href="/admin/orders?status=pending" className="view-all">কল করুন →</Link>} />
          <ul className="x-bars">
            {AGES.map((b) => (
              <li key={b.label}>
                <div className="x-bar-top"><b>{b.label}</b><small>{b.n}টি</small></div>
                <span className="x-bar"><i style={{ width: `${(b.n / ageMax) * 100}%`, background: b.c }} /></span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <Head title="কুরিয়ারে কতদিন ধরে 🚚" sub={`${shipped.length}টি পার্সেল পথে — ৫ দিনের বেশি হলে কুরিয়ারে খোঁজ নিন`} link={<Link href="/admin/orders?status=shipped" className="view-all">দেখুন →</Link>} />
          <ul className="x-bars">
            {STUCK.map((b) => (
              <li key={b.label}>
                <div className="x-bar-top"><b>{b.label}</b><small>{b.n}টি</small></div>
                <span className="x-bar"><i style={{ width: `${(b.n / stuckMax) * 100}%`, background: b.c }} /></span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="dash-grid trio">
        <div className="panel">
          <Head title="দিন বনাম রাতের অর্ডার 🌗" sub={`${range.label} • কোন সময়ের অর্ডার বেশি কনফার্ম হয়`} />
          <ul className="x-bars">
            {PARTS.map((p) => (
              <li key={p.label}>
                <div className="x-bar-top"><b>{p.label}</b><small>{p.n}টি • কনফার্ম {p.conf === null ? "—" : `${p.conf}%`}</small></div>
                <span className="x-bar"><i style={{ width: `${(p.n / partMax) * 100}%`, background: "linear-gradient(90deg, #6366f1, #a855f7)" }} /></span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <Head title="মাসের কোন সময় বিক্রি বেশি 📆" sub="সব সময় • বেতনের সময়ের প্রভাব" />
          <div className="y-month">
            {MONTH.map((m) => (
              <div key={m.label} className={m === bestPart ? "best" : ""}>
                <span><i style={{ height: `${(m.n / monthMax) * 100}%` }} /></span>
                <b>{m.n}টি</b>
                <small>{m.label}</small>
              </div>
            ))}
          </div>
          <p className="y-note">{monthsSeen < 3 ? `ℹ️ এখন মাত্র ${monthsSeen} মাসের অর্ডার আছে — ৩ মাস হলে আসল ধরন বোঝা যাবে` : `💡 মাসের ${WHEN[bestPart.label]} অর্ডার বেশি — তখন অ্যাড বাজেট একটু বাড়াতে পারেন`}</p>
        </div>

        <div className="panel">
          <Head title="রেকর্ড অর্ডার 🏅" sub="সবচেয়ে বড় অর্ডারগুলো" />
          <ul className="y-recs">
            {biggest && <li><span>💰</span><div><small>সবচেয়ে বেশি টাকার অর্ডার</small><b>{money(biggest.total)}</b><em>{biggest.name} • {orderCode(biggest.id, brand)}</em></div></li>}
            {biggestQty && biggestQty.qty > 1 && <li><span>📦</span><div><small>সবচেয়ে বেশি পরিমাণ</small><b>{biggestQty.qty}টি প্যাকেজ</b><em>{biggestQty.name} • {orderCode(biggestQty.id, brand)}</em></div></li>}
            <li><span>⭐</span><div><small>আজকের সবচেয়ে বড়</small><b>{todayBig ? money(todayBig.total) : "—"}</b><em>{todayBig ? todayBig.name : "আজ এখনো অর্ডার আসেনি"}</em></div></li>
          </ul>
        </div>
      </section>

      <section className="dash-grid two">
        <div className="panel">
          <Head title="সন্দেহজনক IP 🕵️" sub="শেষ ৭ দিনে একই ইন্টারনেট থেকে একাধিক নাম্বারে অর্ডার" link={<Link href="/admin/fraud" className="view-all">ফেক প্রোটেকশন →</Link>} />
          {sus.length === 0 ? (
            <p className="y-clean">✅ কোনো সন্দেহজনক কিছু নেই</p>
          ) : (
            <ul className="y-sus">
              {sus.map(([ip, phones]) => (
                <li key={ip}>
                  <b>{ip}</b>
                  <small>{phones.size}টি নাম্বার: {[...phones].slice(0, 3).join(", ")}{phones.size > 3 ? " …" : ""}</small>
                </li>
              ))}
            </ul>
          )}
          <p className="y-note">একই বাসার Wi-Fi থেকে পরিবারের লোকজনও অর্ডার করতে পারে — কল করে নিশ্চিত হয়ে ব্লক করবেন</p>
        </div>

        <div className="panel lucky">
          <Head title="আজকের লাকি কাস্টমার 🍀" sub="ডেলিভারড কাস্টমারদের মধ্যে থেকে প্রতিদিন একজন — ছোট গিফট দিলে আবার কিনবে" />
          {lucky ? (
            <div className="y-lucky">
              <span className="y-lucky-badge">🎁</span>
              <div>
                <b>{lucky.name}</b>
                <small>{lucky.phone} • কিনেছেন {lucky.product}</small>
              </div>
              <a href={luckyMsg} target="_blank" rel="noreferrer" className="adm-btn sm">💬 অভিনন্দন পাঠান</a>
            </div>
          ) : (
            <p className="adm-muted">ডেলিভারড অর্ডার হলে এখানে আসবে</p>
          )}
        </div>
      </section>
    </>
  );
}
