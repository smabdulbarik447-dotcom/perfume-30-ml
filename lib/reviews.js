import { createHmac } from "crypto";
import { sql } from "./db";
import { districtOf } from "./districts";

// Review link er gopon key — shudhu oi order er customer i review dite pare (CRON_SECRET theke banano)
export const reviewKey = (id) =>
  createHmac("sha256", process.env.CRON_SECRET || "").update(`review:${id}`).digest("hex").slice(0, 16);

const SITE = () => `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || "www.avenbd.shop"}`;
export const reviewUrl = (id) => `${SITE()}/review/${id}?k=${reviewKey(id)}`;

/** ডেলিভারড customer ke WhatsApp e review chaoar message */
export function reviewWaLink(s, o) {
  const text = `হাই ${o.name}! ${s.brand} থেকে বলছি 😊 আপনার ${o.product} পেয়েছেন — কেমন লাগলো? ১ মিনিটে একটা রিভিউ দিলে আমরা খুব খুশি হবো ❤️\n${reviewUrl(o.id)}`;
  return `https://wa.me/88${o.phone}?text=${encodeURIComponent(text)}`;
}

// "মোঃ রহিম উদ্দিন" → "রহিম" (website e shudhu prothom nam)
const PREFIX = /^(md\.?|mohammad|muhammad|mohammed|mst\.?|mrs\.?|mr\.?|sk\.?|মোঃ|মো:|মোহাম্মদ|মুহাম্মদ|মোসাঃ|মোছাঃ|মিসেস|শেখ)$/i;
export const firstName = (name) => String(name || "").trim().split(/\s+/).find((w) => !PREFIX.test(w)) || "কাস্টমার";

export async function saveReview(o, rating, text) {
  await sql`
    INSERT INTO reviews (order_id, name, place, product, rating, text)
    VALUES (${o.id}, ${firstName(o.name)}, ${districtOf(o.address, o.area) || ""}, ${o.product}, ${rating}, ${text})
    ON CONFLICT (order_id) DO NOTHING`;
}

/** Website e dekhanor review (admin "দেখান" kora) + gor rating */
export async function publicReviews() {
  try {
    const rows = await sql`SELECT name, place, product, rating, text, created_at FROM reviews WHERE approved ORDER BY created_at DESC LIMIT 12`;
    const [{ n, avg }] = await sql`SELECT count(*)::int AS n, COALESCE(avg(rating), 0)::float AS avg FROM reviews WHERE approved`;
    return { list: rows, count: n, avg };
  } catch {
    return { list: [], count: 0, avg: 0 };
  }
}
