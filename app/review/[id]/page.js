import { notFound } from "next/navigation";
import { sql, ensureTables } from "@/lib/db";
import { getSettings } from "@/lib/store";
import { reviewKey, firstName } from "@/lib/reviews";
import Brand from "@/components/Brand";
import ReviewForm from "./ReviewForm";
import "./review.css";

export const metadata = { title: "রিভিউ দিন", robots: { index: false } };

// Delivered customer WhatsApp er link theke ashe — tara ki bhabe, ek minute e
export default async function ReviewPage({ params, searchParams }) {
  const id = Number((await params).id);
  const k = String((await searchParams).k || "");
  if (!id || k !== reviewKey(id)) notFound();
  await ensureTables();
  const [[o], [done], s] = await Promise.all([
    sql`SELECT id, name, product, status FROM orders WHERE id = ${id}`,
    sql`SELECT rating FROM reviews WHERE order_id = ${id}`,
    getSettings(),
  ]);
  if (!o) notFound();

  return (
    <main className="rv-page">
      <header><Brand s={s} /></header>
      <section className="rv-card">
        {done ? (
          <div className="rv-thanks">
            <span>💜</span>
            <h1>ধন্যবাদ, {firstName(o.name)}!</h1>
            <p>আপনার রিভিউ আমরা পেয়েছি। আবার কেনাকাটায় আপনাকে পেলে খুশি হবো।</p>
            <a href="/" className="btn">সাইটে ফিরে যান</a>
          </div>
        ) : o.status !== "delivered" ? (
          <div className="rv-thanks">
            <span>📦</span>
            <h1>পার্সেল পাওয়ার পর রিভিউ দিন</h1>
            <p>আপনার অর্ডার এখনো ডেলিভারি হয়নি। পণ্য হাতে পাওয়ার পর এই লিংকেই রিভিউ দিতে পারবেন।</p>
          </div>
        ) : (
          <>
            <h1>কেমন লাগলো, {firstName(o.name)}? 🌸</h1>
            <p className="rv-prod">🛍️ {o.product}</p>
            <ReviewForm id={id} k={k} />
          </>
        )}
      </section>
    </main>
  );
}
