import Link from "next/link";
import { sql, ensureTables, orderCode } from "@/lib/db";
import { getSettings } from "@/lib/store";
import { trackingLink, courierName } from "@/lib/courier";
import Brand from "@/components/Brand";
import "./track.css";

export const metadata = { title: "অর্ডার ট্র্যাক করুন", robots: { index: false } };

const bn = (n) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
const fmtDate = (d) => new Date(d).toLocaleDateString("bn-BD", { timeZone: "Asia/Dhaka", day: "numeric", month: "long" });

// Customer er dik theke dhap: অর্ডার → কনফার্ম → কুরিয়ারে → ডেলিভারড
const STEPS = [
  { id: "pending", icon: "📝", label: "অর্ডার পেয়েছি" },
  { id: "confirmed", icon: "✅", label: "কনফার্ম" },
  { id: "shipped", icon: "🚚", label: "কুরিয়ারে পথে" },
  { id: "delivered", icon: "🎁", label: "ডেলিভারড" },
];
const MSG = {
  pending: "অর্ডার পেয়েছি! আমাদের প্রতিনিধি শীঘ্রই কল করে কনফার্ম করবেন। ফোনটা কাছে রাখুন 📞",
  confirmed: "অর্ডার কনফার্ম হয়েছে — খুব শীঘ্রই প্যাক করে কুরিয়ারে দেওয়া হবে 📦",
  shipped: "পার্সেল কুরিয়ারে পথে আছে — ডেলিভারি ম্যান কল দিলে রিসিভ করুন 🚚",
  delivered: "পার্সেল পৌঁছে গেছে — ধন্যবাদ! সুগন্ধ উপভোগ করুন 🌸",
  cancelled: "এই অর্ডারটি বাতিল হয়েছে। আবার অর্ডার করতে চাইলে নিচের বাটনে চাপুন।",
  returned: "এই পার্সেলটি ফেরত গেছে। কোনো সমস্যা হলে আমাদের সাথে যোগাযোগ করুন।",
};

// Customer nijer number diye dekhe tar order kothay — kal kore jiggesh korte hoy na (nam/thikana dekhay na)
export default async function TrackPage({ searchParams }) {
  const phone = String((await searchParams).phone || "").replace(/\D/g, "").replace(/^88/, "");
  const valid = /^01[3-9]\d{8}$/.test(phone);
  await ensureTables();
  const [s, orders] = await Promise.all([
    getSettings(),
    valid
      ? sql`SELECT id, created_at, product, qty, total, status, courier, courier_id, tracking_code, phone FROM orders
            WHERE phone = ${phone} AND created_at > now() - interval '90 days' ORDER BY created_at DESC LIMIT 5`
      : [],
  ]);

  return (
    <main className="trk">
      <header className="trk-head">
        <Link href="/"><Brand s={s} /></Link>
      </header>

      <section className="trk-card">
        <h1>📦 আপনার অর্ডার কোথায়?</h1>
        <p>অর্ডার করার সময় যে মোবাইল নাম্বার দিয়েছিলেন সেটা লিখুন</p>
        <form className="trk-form">
          <input name="phone" defaultValue={phone} inputMode="numeric" placeholder="01XXXXXXXXX" maxLength={14} required autoFocus={!valid} />
          <button className="btn">খুঁজুন</button>
        </form>
        {phone && !valid && <p className="trk-err">সঠিক ১১ সংখ্যার মোবাইল নাম্বার দিন</p>}
      </section>

      {valid && orders.length === 0 && (
        <section className="trk-card trk-empty">
          <p>😕 এই নাম্বারে গত ৯০ দিনে কোনো অর্ডার পাওয়া যায়নি।</p>
          <Link href="/#order" className="btn">এখনই অর্ডার করুন</Link>
        </section>
      )}

      {orders.map((o) => {
        const at = STEPS.findIndex((x) => x.id === o.status);
        const ended = o.status === "cancelled" || o.status === "returned";
        const link = trackingLink(o);
        return (
          <section key={o.id} className={`trk-card trk-order ${ended ? "ended" : ""}`}>
            <div className="trk-top">
              <b>অর্ডার {orderCode(o.id, s.brand)}</b>
              <small>{fmtDate(o.created_at)}</small>
            </div>
            <p className="trk-prod">🛍️ {o.product}{o.qty > 1 ? ` × ${bn(o.qty)}` : ""} — <b>৳{bn(Number(o.total).toLocaleString("en-IN"))}</b></p>

            {ended ? (
              <div className="trk-ended">{o.status === "cancelled" ? "❌ বাতিল" : "↩️ ফেরত"}</div>
            ) : (
              <ol className="trk-steps" style={{ "--done": at }}>
                {STEPS.map((st, i) => (
                  <li key={st.id} className={i < at ? "done" : i === at ? "now" : ""}>
                    <span>{i <= at ? st.icon : "○"}</span>
                    <small>{st.label}</small>
                  </li>
                ))}
              </ol>
            )}
            <p className="trk-msg">{MSG[o.status]}</p>

            {link && !ended && o.status !== "delivered" && (
              <a href={link} target="_blank" rel="noreferrer" className="trk-courier">
                🔎 {courierName(o)} এ লাইভ ট্র্যাক করুন{o.tracking_code ? ` (${o.tracking_code})` : ""}
              </a>
            )}
          </section>
        );
      })}

      <section className="trk-help">
        <p>কোনো প্রশ্ন আছে?</p>
        <div>
          {s.phone && <a href={`tel:${s.phone}`} className="trk-help-btn">📞 কল করুন</a>}
          {s.whatsapp && <a href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noreferrer" className="trk-help-btn wa">💬 WhatsApp</a>}
        </div>
      </section>
    </main>
  );
}
