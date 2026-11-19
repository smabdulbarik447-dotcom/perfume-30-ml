import Link from "next/link";
import { dhakaDay, money } from "@/lib/dateRange";
import { orderCode } from "@/lib/db";
import { districtOf } from "@/lib/districts";

const DAY = 864e5;
const isSale = (o) => ["confirmed", "shipped", "delivered"].includes(o.status);
const STATUS_ICON = { pending: "⏳", confirmed: "✅", shipped: "🚚", delivered: "🎁", returned: "↩️", cancelled: "❌" };
const COURIER_STATUS = {
  in_review: "রিভিউতে", pending: "পথে আছে", hold: "হোল্ড", unknown: "অজানা", not_found: "পাওয়া যায়নি",
  delivered_approval_pending: "ডেলিভারড (অনুমোদন বাকি)", cancelled_approval_pending: "বাতিল (অনুমোদন বাকি)",
  partial_delivered_approval_pending: "আংশিক (অনুমোদন বাকি)",
};
const COLORS = ["#7c3aed", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9", "#ef4444", "#84cc16"];
const time = (d) => new Date(d).toLocaleTimeString("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit" });

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

// Choto line chart (SVG) — 30 diner protidin er man
function Spark({ values, color }) {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - (v / max) * 26}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="z-spark">
      <polygon points={`0,32 ${pts} 100,32`} fill={color} opacity=".15" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Dashboard er aro 6 ta panel */
export default function BonusPanels({ orders, inR, range, brand }) {
  const today = dhakaDay(Date.now());

  // 1. আজকের টাইমলাইন
  const todayList = orders.filter((o) => dhakaDay(o.created_at) === today);

  // 2. ৩০ দিনের মিনি চার্ট
  const days = Array.from({ length: 30 }, (_, i) => dhakaDay(Date.now() - (29 - i) * DAY));
  const byDay = (f) => days.map((d) => f(orders.filter((o) => dhakaDay(o.created_at) === d)));
  const sparks = [
    { label: "অর্ডার", v: byDay((l) => l.length), c: "#7c3aed", f: (n) => `${n}টি` },
    { label: "কনফার্মড বিক্রি", v: byDay((l) => l.filter(isSale).reduce((t, o) => t + o.total, 0)), c: "#16a34a", f: money },
    { label: "বাতিল", v: byDay((l) => l.filter((o) => o.status === "cancelled").length), c: "#ef4444", f: (n) => `${n}টি` },
    { label: "রিটার্ন", v: byDay((l) => l.filter((o) => o.status === "returned").length), c: "#f97316", f: (n) => `${n}টি` },
  ].map((s) => ({ ...s, total: s.v.reduce((a, b) => a + b, 0) }));

  // 3. দুর্বল ঠিকানা: courier e jaoar age (pending/confirmed) — choto ba jela bojha jay na
  const weak = orders
    .filter((o) => (o.status === "pending" || o.status === "confirmed") && !o.courier_id)
    .map((o) => ({ o, why: String(o.address || "").trim().length < 15 ? "ঠিকানা খুব ছোট" : !districtOf(o.address) && o.area !== "inside" ? "জেলা বোঝা যাচ্ছে না" : "" }))
    .filter((x) => x.why)
    .slice(0, 6);

  // 4. ডুপ্লিকেট: ek number e 24 ghontay ekadhik চালু order
  const recent = orders.filter((o) => Date.now() - new Date(o.created_at).getTime() < DAY && o.status !== "cancelled");
  const dupMap = {};
  for (const o of recent) (dupMap[o.phone] ||= []).push(o);
  const dups = Object.values(dupMap).filter((l) => l.length > 1);

  // 5. কুরিয়ারে পার্সেলের অবস্থা (shipped)
  const shipped = orders.filter((o) => o.status === "shipped");
  const csMap = {};
  for (const o of shipped) {
    const k = o.courier_status || "unknown";
    csMap[k] = (csMap[k] || 0) + 1;
  }
  const csRows = Object.entries(csMap).sort((a, b) => b[1] - a[1]);
  const hold = csMap.hold || 0;

  // 6. পণ্যের ভাগ (beche neya shomoy, kotogulo package)
  const pMap = {};
  for (const o of inR) pMap[o.product || "—"] = (pMap[o.product || "—"] || 0) + o.qty;
  const pRows = Object.entries(pMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const pTotal = pRows.reduce((t, [, n]) => t + n, 0);
  let acc = 0;
  const donut = pTotal
    ? `conic-gradient(${pRows.map(([, n], i) => { const a = acc; acc += (n / pTotal) * 100; return `${COLORS[i]} ${a}% ${acc}%`; }).join(", ")})`
    : "conic-gradient(#e5e7eb 0 100%)";

  return (
    <>
      <section className="dash-grid one-col">
        <div className="panel">
          <Head title="৩০ দিনের ছবি 📉" sub="প্রতিদিনের অর্ডার, বিক্রি, বাতিল আর রিটার্ন — এক নজরে উঠানামা" />
          <div className="z-sparks">
            {sparks.map((s) => (
              <div key={s.label} className="z-spark-card">
                <small>{s.label}</small>
                <b style={{ color: s.c }}>{s.f(s.total)}</b>
                <Spark values={s.v} color={s.c} />
                <em>আজ {s.f(s.v.at(-1))}</em>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dash-grid trio">
        <div className="panel">
          <Head title="আজকের টাইমলাইন 🕒" sub={`আজ ${todayList.length}টি অর্ডার — কখন কে`} />
          {todayList.length === 0 ? (
            <p className="adm-muted">আজ এখনো অর্ডার আসেনি</p>
          ) : (
            <ol className="z-time">
              {todayList.slice(0, 12).map((o) => (
                <li key={o.id}>
                  <span className="z-time-t">{time(o.created_at)}</span>
                  <span className="z-time-dot">{STATUS_ICON[o.status] || "•"}</span>
                  <div>
                    <b>{o.name}</b>
                    <small>{o.product}{o.qty > 1 ? ` × ${o.qty}` : ""} • {money(o.total)}</small>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="panel">
          <Head title="পণ্যের ভাগ 🍩" sub={`${range.label} • কোন পণ্য কত প্যাকেজ গেছে`} />
          {pTotal === 0 ? (
            <p className="adm-muted">এই সময়ে অর্ডার নেই</p>
          ) : (
            <div className="z-pie">
              <div className="z-pie-ring" style={{ background: donut }}><div><b>{pTotal}</b><small>প্যাকেজ</small></div></div>
              <ul>
                {pRows.map(([name, n], i) => (
                  <li key={name}><i style={{ background: COLORS[i] }} /><span>{name}</span><b>{Math.round((n / pTotal) * 100)}%</b></li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="panel">
          <Head title="কুরিয়ারে পার্সেলের অবস্থা 📮" sub={`${shipped.length}টি পার্সেল পথে${hold ? ` • ${hold}টি হোল্ডে!` : ""}`} link={<Link href="/admin/courier" className="view-all">কুরিয়ার →</Link>} />
          {csRows.length === 0 ? (
            <p className="adm-muted">এখন কোনো পার্সেল পথে নেই</p>
          ) : (
            <ul className="z-cs">
              {csRows.map(([k, n]) => (
                <li key={k} className={k === "hold" || k === "not_found" ? "warn" : ""}>
                  <span>{COURIER_STATUS[k] || k}</span>
                  <b>{n}টি</b>
                </li>
              ))}
            </ul>
          )}
          {hold > 0 && <p className="y-note">⚠️ হোল্ডে থাকা পার্সেলের কাস্টমারকে কল করে নিন — না হলে রিটার্ন হতে পারে</p>}
        </div>
      </section>

      <section className="dash-grid two">
        <div className="panel">
          <Head title="দুর্বল ঠিকানা ⚠️" sub="কুরিয়ারে পাঠানোর আগে ঠিক করে নিন — ভুল ঠিকানায় পার্সেল ফেরত আসে" link={<Link href="/admin/orders?status=pending" className="view-all">অর্ডার →</Link>} />
          {weak.length === 0 ? (
            <p className="y-clean">✅ পাঠানোর অপেক্ষায় থাকা সব অর্ডারের ঠিকানা ঠিক আছে</p>
          ) : (
            <ul className="y-sus">
              {weak.map(({ o, why }) => (
                <li key={o.id}>
                  <b>{orderCode(o.id, brand)} • {o.name}</b>
                  <small>📍 “{o.address}” — {why}</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <Head title="ডুপ্লিকেট অর্ডার 👯" sub="শেষ ২৪ ঘণ্টায় একই নাম্বার থেকে একাধিক অর্ডার — ভুলে দুবার দিয়েছে কিনা দেখুন" />
          {dups.length === 0 ? (
            <p className="y-clean">✅ কোনো ডুপ্লিকেট নেই</p>
          ) : (
            <ul className="y-sus">
              {dups.map((l) => (
                <li key={l[0].phone}>
                  <b>{l[0].name} • {l[0].phone}</b>
                  <small>{l.length}টি অর্ডার: {l.map((o) => orderCode(o.id, brand)).join(", ")}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
