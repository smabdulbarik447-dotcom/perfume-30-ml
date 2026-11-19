import { sql, ensureTables, orderCode } from "@/lib/db";
import { getSettings } from "@/lib/store";
import { reviewWaLink } from "@/lib/reviews";
import { ReviewActions } from "./ReviewActions";

const fmtDate = (d) => new Date(d).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short" });
const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);

// Asol customer er review: ডেলিভারড customer ke WhatsApp e link → tara rating dey → apni "দেখান" dile website e
export default async function ReviewsPage() {
  await ensureTables();
  const [s, reviews, ask] = await Promise.all([
    getSettings(),
    sql`SELECT r.*, o.phone FROM reviews r LEFT JOIN orders o ON o.id = r.order_id ORDER BY r.approved, r.created_at DESC`,
    sql`SELECT o.id, o.name, o.phone, o.product, o.created_at FROM orders o
        WHERE o.status = 'delivered' AND o.created_at > now() - interval '60 days'
          AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.order_id = o.id)
        ORDER BY o.created_at DESC LIMIT 40`,
  ]);
  const shown = reviews.filter((r) => r.approved);
  const avg = shown.length ? shown.reduce((t, r) => t + r.rating, 0) / shown.length : 0;
  const waiting = reviews.filter((r) => !r.approved).length;

  return (
    <>
      <h1 className="adm-title">কাস্টমার রিভিউ ⭐</h1>
      <p className="adm-muted adm-intro">
        ডেলিভারড কাস্টমারকে WhatsApp এ রিভিউ লিংক পাঠান → কাস্টমার তারা দিয়ে লিখে পাঠায় → আপনি <b>“✅ সাইটে দেখান”</b> চাপলে ওয়েবসাইটে
        “ভেরিফায়েড কাস্টমার” রিভিউ হিসেবে দেখাবে। নতুন রিভিউ এলে Telegram এ জানাবে।
      </p>

      <section className="adm-cards fraud-cards">
        <div className="adm-card"><span className="adm-icon yellow">⭐</span><small>গড় রেটিং (সাইটে)</small><b>{shown.length ? `${avg.toFixed(1)} / ৫` : "—"}</b></div>
        <div className="adm-card"><span className="adm-icon green">✅</span><small>সাইটে দেখাচ্ছে</small><b>{shown.length}টি</b></div>
        <div className="adm-card"><span className="adm-icon blue">🕓</span><small>দেখার অপেক্ষায়</small><b>{waiting}টি</b></div>
        <div className="adm-card"><span className="adm-icon red">💬</span><small>রিভিউ চাওয়া বাকি</small><b>{ask.length}জন</b></div>
      </section>

      <div className="adm-grid even">
        <div className="adm-box">
          <h3>📝 পাওয়া রিভিউ</h3>
          {reviews.length === 0 ? (
            <p className="adm-muted">এখনো কোনো রিভিউ আসেনি — পাশের লিস্ট থেকে কাস্টমারদের লিংক পাঠান</p>
          ) : (
            <ul className="rvw-list">
              {reviews.map((r) => (
                <li key={r.id} className={r.approved ? "on" : ""}>
                  <div className="rvw-top">
                    <b className="rvw-stars">{stars(r.rating)}</b>
                    <small>{r.name}{r.place ? `, ${r.place}` : ""} • {fmtDate(r.created_at)} • #{orderCode(r.order_id, s.brand)}</small>
                  </div>
                  {r.text ? <p>“{r.text}”</p> : <p className="adm-muted">(শুধু রেটিং দিয়েছেন)</p>}
                  <small className="adm-muted">🛍️ {r.product}</small>
                  <ReviewActions id={Number(r.id)} approved={r.approved} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="adm-box">
          <h3>💬 রিভিউ চান (ডেলিভারড, শেষ ৬০ দিন)</h3>
          {ask.length === 0 ? (
            <p className="adm-muted">সবার কাছে রিভিউ পাওয়া গেছে, বা এখনো ডেলিভারড অর্ডার নেই</p>
          ) : (
            <ul className="rvw-ask">
              {ask.map((o) => (
                <li key={o.id}>
                  <div>
                    <b>{o.name}</b>
                    <small>{o.product} • {fmtDate(o.created_at)}</small>
                  </div>
                  <a href={reviewWaLink(s, o)} target="_blank" rel="noreferrer" className="adm-btn sm">💬 লিংক পাঠান</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
