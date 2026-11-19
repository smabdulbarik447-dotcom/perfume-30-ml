"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { sql, ensureTables } from "@/lib/db";
import { reviewKey, saveReview } from "@/lib/reviews";

export async function submitReview(_prev, formData) {
  const id = Number(formData.get("id"));
  if (!id || String(formData.get("k")) !== reviewKey(id)) return { error: "লিংকটা ঠিক নেই" };
  const rating = Math.min(5, Math.max(1, Math.round(Number(formData.get("rating")) || 5)));
  const text = String(formData.get("text") || "").trim().slice(0, 400);
  await ensureTables();
  const [o] = await sql`SELECT id, name, product, address, area, status FROM orders WHERE id = ${id}`;
  if (!o || o.status !== "delivered") return { error: "পার্সেল পাওয়ার পর রিভিউ দিন" };
  await saveReview(o, rating, text);
  revalidatePath(`/review/${id}`);
  revalidatePath("/admin", "layout");
  // Telegram e janano (notun review — admin dekhe website e dekhabe)
  after(async () => {
    const { sendToAll } = await import("@/lib/telegram");
    const clean = text.replace(/[<>&]/g, "");
    await sendToAll(`⭐ <b>নতুন রিভিউ</b> — ${"★".repeat(rating)}${"☆".repeat(5 - rating)}\n${o.product}${clean ? `\n“${clean}”` : ""}\n\nওয়েবসাইটে দেখাতে: অ্যাডমিন → রিভিউ`).catch(() => {});
  });
  return { ok: true };
}
