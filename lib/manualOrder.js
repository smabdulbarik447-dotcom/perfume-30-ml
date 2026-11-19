import { sql } from "./db";
import { getProducts, getSettings, deliveryOptions, deliveryCharge } from "./store";

const bnDigits = (s) => String(s).replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));

/**
 * Telegram e likha lekha theke nam/nambar/thikana/taka ber kore:
 * je line e 11 digit nambar sheta phone, shudhu shonkha (৳1200) hole mot taka, prothom baki line nam, baki gulo thikana
 */
export function parseCustomer(text) {
  const lines = String(text || "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  let phone = "", total = null;
  const rest = [];
  for (const line of lines) {
    const digits = bnDigits(line).replace(/[\s\-+()]/g, "");
    const p = digits.replace(/^880/, "0").replace(/^88(?=01)/, "");
    if (!phone && /^01[3-9]\d{8}$/.test(p)) phone = p;
    else if (total === null && /^(৳|tk\.?|taka|টাকা)?\s*\d{2,7}\s*(৳|tk|taka|টাকা)?$/i.test(bnDigits(line).replace(/,/g, ""))) total = Number(bnDigits(line).replace(/\D/g, ""));
    else rest.push(line);
  }
  return { name: (rest[0] || "").slice(0, 100), address: rest.slice(1).join(", ").slice(0, 500), phone, total };
}

/** Phone/Telegram e asha order boshay — dam nije hishab (total dile shetai) */
export async function createManualOrder({ name, phone, address, productId, qty, areaId, total, status = "pending", note = "" }) {
  if (!name) return { error: "নাম দিন" };
  if (!address) return { error: "ঠিকানা দিন" };
  if (!/^01[3-9]\d{8}$/.test(phone || "")) return { error: "সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন" };
  const [products, settings] = await Promise.all([getProducts({ all: true }), getSettings()]);
  const product = products.find((p) => p.id === Number(productId));
  const area = deliveryOptions(settings).find((d) => d.id === areaId);
  if (!product || !area) return { error: "পণ্য বা ডেলিভারি এরিয়া পাওয়া যায়নি" };
  const n = Math.min(50, Math.max(1, Number(qty) || 1));
  const auto = product.price * n + deliveryCharge(settings, area, product, n);
  const sum = total != null && total >= 0 ? Math.round(total) : auto;
  const [row] = await sql`
    INSERT INTO orders (name, phone, address, product, area, qty, total, status, note)
    VALUES (${name}, ${phone}, ${address}, ${product.name}, ${area.id}, ${n}, ${sum}, ${status}, ${note.slice(0, 500)})
    RETURNING id`;
  await sql`UPDATE products SET stock = GREATEST(stock - ${n}, 0) WHERE id = ${product.id}`;
  await sql`DELETE FROM incomplete_orders WHERE phone = ${phone}`;
  return { id: Number(row.id), total: sum, product, area, qty: n };
}
