import { timingSafeEqual } from "crypto";
import { after } from "next/server";
import { afterStatusChange } from "@/lib/orderHooks";
import { revalidatePath } from "next/cache";
import { sql, ensureTables, STATUSES, orderCode } from "@/lib/db";
import { getSettings, getProducts, deliveryOptions, deliveryCharge, orderDelivery } from "@/lib/store";
import {
  tg, linkCode, getChats, addChat, removeChat, syncOrder, summaryText, sendOrderCard, trackMessage, notifyNewOrder,
} from "@/lib/telegram";
import { parseCustomer, createManualOrder } from "@/lib/manualOrder";
import { COURIERS, sendOrderToCourier, autoSendOnConfirm, autoSendText } from "@/lib/courier";

const HELP = [
  "🤖 <b>কমান্ড সমূহ</b>",
  "/new বা ➕ নতুন অর্ডার — কল/ইনবক্সের অর্ডার এখান থেকে বসান",
  "/orders — সর্বশেষ ১০টি অর্ডার (বাটনসহ)",
  "/pending — পেন্ডিং অর্ডারগুলো (বাটনসহ)",
  "/confirmed — কনফার্মড অর্ডার, শিপ করার জন্য",
  "/shipped — শিপড অর্ডার, ডেলিভারি আপডেটের জন্য",
  "/order VE000012 — নির্দিষ্ট অর্ডার (কোড, আইডি বা মোবাইল নাম্বার)",
  "/today — আজকের হিসাব   /stats — সব মিলিয়ে",
  "/stop — এই চ্যাটে নোটিফিকেশন বন্ধ",
  "✏️ অর্ডারের নিচে \"কাস্টমারের তথ্য এডিট\" চেপে নাম/নাম্বার/ঠিকানা/টাকা/এলাকা বদলান",
  "",
  "প্রতিটি অর্ডারের নিচের বাটন চেপে স্ট্যাটাস বদলান — অ্যাডমিন প্যানেলেও সাথে সাথে বদলে যাবে।",
].join("\n");

// "/pending" er moto status command → oi status er order gulo
const LIST_COMMANDS = { "/pending": "pending", "/confirmed": "confirmed", "/shipped": "shipped" };
const MAX_CARDS = 10;

function validSecret(req) {
  const got = Buffer.from(req.headers.get("x-telegram-bot-api-secret-token") || "");
  const want = Buffer.from(process.env.TELEGRAM_SECRET || "");
  return want.length > 0 && got.length === want.length && timingSafeEqual(got, want);
}

const reply = (chat_id, text, extra = {}) => tg("sendMessage", { chat_id, text, parse_mode: "HTML", ...extra });

/* ---------- Telegram theke manual order: পণ্য → পরিমাণ → এলাকা → নাম/নাম্বার/ঠিকানা ---------- */
const NEW_BTN = "➕ নতুন অর্ডার";
// Chat er nicher sthayi button (shob shomoy dekha jay)
const MAIN_KEYBOARD = {
  keyboard: [[{ text: NEW_BTN }], [{ text: "/pending" }, { text: "/today" }]],
  resize_keyboard: true,
  is_persistent: true,
};
const COMMANDS = [
  { command: "new", description: "নতুন অর্ডার বসান" },
  { command: "pending", description: "পেন্ডিং অর্ডার" },
  { command: "confirmed", description: "কনফার্মড অর্ডার" },
  { command: "shipped", description: "শিপড অর্ডার" },
  { command: "orders", description: "সর্বশেষ ১০টি অর্ডার" },
  { command: "order", description: "নির্দিষ্ট অর্ডার খুঁজুন" },
  { command: "today", description: "আজকের হিসাব" },
  { command: "stats", description: "সব মিলিয়ে হিসাব" },
];
// Help er sathe nicher ➕ নতুন অর্ডার button ar "/" menu er command list
async function sendHelp(chatId, prefix = "") {
  await reply(chatId, prefix + HELP, { reply_markup: MAIN_KEYBOARD });
  await tg("setMyCommands", { commands: COMMANDS });
}
const ib = (text, data) => ({ text, callback_data: data });
const taka = (n) => `৳${Number(n).toLocaleString("en-IN")}`;

async function newOrderStep(chatId, data, settings, messageId) {
  const [, step, pid, qty, area] = data.split(":");
  const show = (text, rows) =>
    messageId
      ? tg("editMessageText", { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", reply_markup: { inline_keyboard: rows } })
      : reply(chatId, text, { reply_markup: { inline_keyboard: rows } });
  const cancel = [ib("✖️ বাতিল", "mo:x")];

  if (step === "x") {
    return tg("editMessageText", { chat_id: chatId, message_id: messageId, text: "✖️ নতুন অর্ডার বাতিল করা হয়েছে" });
  }
  const products = await getProducts();
  if (!step || step === "s") {
    if (!products.length) return show("❌ কোনো চালু পণ্য নেই — অ্যাডমিন প্যানেল থেকে পণ্য চালু করুন", []);
    return show("➕ <b>নতুন অর্ডার</b>\n\n১/৪ — কোন পণ্য?", [
      ...products.map((p) => [ib(`${p.name} — ${taka(p.price)}`, `mo:p:${p.id}`)]),
      cancel,
    ]);
  }
  const product = products.find((p) => p.id === Number(pid));
  if (!product) return show("❌ পণ্যটি পাওয়া যায়নি, আবার শুরু করুন", [[ib("🔄 আবার শুরু", "mo:s")]]);
  if (step === "p") {
    return show(`➕ <b>নতুন অর্ডার</b>\n📦 ${product.name}\n\n২/৪ — কয়টা?`, [
      [1, 2, 3, 4, 5].map((n) => ib(`${n}`, `mo:q:${product.id}:${n}`)),
      [ib("⬅️ পেছনে", "mo:s"), ...cancel],
    ]);
  }
  const n = Math.min(50, Math.max(1, Number(qty) || 1));
  const areas = deliveryOptions(settings);
  if (step === "q") {
    return show(`➕ <b>নতুন অর্ডার</b>\n📦 ${product.name} × ${n}\n\n৩/৪ — ডেলিভারি কোথায়?`, [
      ...areas.map((a) => [ib(`🚚 ${a.label} — ${taka(product.price * n + deliveryCharge(settings, a, product, n))}`, `mo:a:${product.id}:${n}:${a.id}`)]),
      [ib("⬅️ পেছনে", `mo:p:${product.id}`), ...cancel],
    ]);
  }
  const a = areas.find((x) => x.id === area);
  if (step === "a" && a) {
    const total = product.price * n + deliveryCharge(settings, a, product, n);
    await show(`➕ <b>নতুন অর্ডার</b>\n📦 ${product.name} × ${n}\n🚚 ${a.label}\n💰 মোট ${taka(total)}`, []);
    // Bot er ei message er reply e customer er tottho — tag theke bujhi kon order
    return reply(
      chatId,
      [
        "৪/৪ — <b>কাস্টমারের তথ্য</b> এই মেসেজের রিপ্লাই দিয়ে লিখুন, প্রতিটি আলাদা লাইনে:",
        "",
        "<i>নাম</i>",
        "<i>মোবাইল নাম্বার</i>",
        "<i>ঠিকানা</i>",
        "<i>(চাইলে) মোট টাকা — না দিলে " + taka(total) + "</i>",
        "",
        `<code>new:${product.id}:${n}:${a.id}</code>`,
      ].join("\n"),
      { reply_markup: { force_reply: true, input_field_placeholder: "নাম / নাম্বার / ঠিকানা" } },
    );
  }
  return show("❌ কিছু ভুল হয়েছে, আবার শুরু করুন", [[ib("🔄 আবার শুরু", "mo:s")]]);
}

/* ---------- Telegram theke customer er tottho edit ---------- */
const EDIT_FIELDS = {
  name: { label: "👤 নাম", tag: "নাম", ask: "নতুন নাম লিখুন" },
  phone: { label: "📞 নাম্বার", tag: "নাম্বার", ask: "নতুন মোবাইল নাম্বার লিখুন" },
  address: { label: "📍 ঠিকানা", tag: "ঠিকানা", ask: "নতুন ঠিকানা লিখুন" },
  total: { label: "💰 মোট টাকা", tag: "টাকা", ask: "নতুন মোট টাকা লিখুন (শুধু সংখ্যা)" },
  note: { label: "📝 নোট", tag: "নোট", ask: "নোট লিখুন (মুছতে শুধু - লিখুন)" },
};

const esc = (x) => String(x ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// "✏️ আগের ... এডিট" button er pathano lekha: "@bot #370 ঠিকানা: notun thikana"
function parsePrefilled(text) {
  const m = String(text || "").match(/^(?:@w+s+)?#(d+)s+(S+?):s*([sS]*)$/);
  if (!m) return null;
  const field = Object.keys(EDIT_FIELDS).find((k) => EDIT_FIELDS[k].tag === m[2]);
  return field ? { id: Number(m[1]), field, value: m[3].trim() } : null;
}

function editMenu(id, settings) {
  const b = (f) => ({ text: EDIT_FIELDS[f].label, callback_data: `ef:${id}:${f}` });
  return [
    [b("name"), b("phone")],
    [b("address"), b("total")],
    [b("note")],
    deliveryOptions(settings).map((a) => ({ text: `🚚 ${a.label}`, callback_data: `ea:${id}:${a.id}` })),
  ];
}

const bnDigits = (s) => String(s).replace(/[০-৯]/g, (d) => "০১২৩৪৫৬৭৮৯".indexOf(d));

async function editOrder(id, field, value, settings) {
  const [o] = await sql`SELECT id, name, phone, address, area, product, qty, total, courier_id, courier, delivery_fee FROM orders WHERE id = ${id}`;
  if (!o) return { error: "অর্ডারটি পাওয়া যায়নি (মুছে ফেলা হয়েছে)" };
  const v = String(value || "").trim();
  let change;
  if (field === "name") {
    if (!v) return { error: "নাম খালি রাখা যাবে না" };
    await sql`UPDATE orders SET name = ${v.slice(0, 100)} WHERE id = ${id}`;
    change = `নাম: ${v.slice(0, 100)}`;
  } else if (field === "phone") {
    const phone = bnDigits(v).replace(/\D/g, "").replace(/^880/, "0");
    if (!/^01[3-9]\d{8}$/.test(phone)) return { error: "সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন" };
    await sql`UPDATE orders SET phone = ${phone} WHERE id = ${id}`;
    change = `নাম্বার: ${phone}`;
  } else if (field === "address") {
    if (!v) return { error: "ঠিকানা খালি রাখা যাবে না" };
    await sql`UPDATE orders SET address = ${v.slice(0, 500)} WHERE id = ${id}`;
    change = "ঠিকানা আপডেট";
  } else if (field === "note") {
    const note = v === "-" ? "" : v.slice(0, 500);
    await sql`UPDATE orders SET note = ${note} WHERE id = ${id}`;
    change = note ? "নোট আপডেট" : "নোট মুছে ফেলা হয়েছে";
  } else if (field === "total") {
    const total = Math.round(Number(bnDigits(v).replace(/[,৳\s]/g, "")));
    if (!Number.isFinite(total) || total < 0 || total > 1000000) return { error: "সঠিক টাকার পরিমাণ দিন (শুধু সংখ্যা)" };
    await sql`UPDATE orders SET total = ${total} WHERE id = ${id}`;
    change = `মোট টাকা: ৳${total}`;
  } else if (field === "area") {
    const areas = deliveryOptions(settings);
    const area = areas.find((a) => a.id === v);
    if (!area) return { error: "এলাকা পাওয়া যায়নি" };
    if (area.id === o.area) return { toast: `এলাকা আগে থেকেই ${area.label}` };
    // Poner dam thik rekhe notun elakar delivery charge (ফ্রি ডেলিভারি thakle ফ্রি-i thake)
    const products = await getProducts({ all: true });
    const items = o.total - orderDelivery(settings, products, o);
    const fee = o.delivery_fee === 0 ? 0 : deliveryCharge(settings, area, products.find((p) => p.name === o.product), o.qty);
    const total = Math.max(0, items + fee);
    await sql`UPDATE orders SET area = ${area.id}, total = ${total} WHERE id = ${id}`;
    change = `এলাকা: ${area.label} (মোট ৳${total})`;
  } else {
    return { error: "ভুল অপশন" };
  }
  await syncOrder(id, { fromTelegram: true });
  revalidatePath("/admin", "layout");
  return {
    toast: `${orderCode(id, settings.brand)} — ${change}`,
    warning: o.courier_id && field !== "note"
      ? `অর্ডারটা আগেই ${COURIERS[o.courier || "steadfast"]?.name || "কুরিয়ার"} এ পাঠানো (${o.courier_id}) — ওখানে কুরিয়ারের প্যানেল থেকে বা কল করে বদলাতে হবে।`
      : "",
  };
}

export async function POST(req) {
  // Shudhu Telegram (amader secret shoho) e request nibe
  if (!validSecret(req)) return new Response("forbidden", { status: 403 });
  const update = await req.json().catch(() => null);
  if (!update) return Response.json({ ok: true });

  try {
    await ensureTables();
    const settings = await getSettings();
    const chats = getChats(settings);

    /* ---------- Button chaapa ---------- */
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = String(cb.message?.chat?.id);
      if (!chats.includes(chatId)) {
        await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "অনুমতি নেই", show_alert: true });
        return Response.json({ ok: true });
      }
      if (String(cb.data).startsWith("mo:")) {
        await tg("answerCallbackQuery", { callback_query_id: cb.id });
        await newOrderStep(chatId, String(cb.data), settings, cb.message.message_id);
        return Response.json({ ok: true });
      }
      const [action, id, status] = String(cb.data).split(":");
      const orderId = Number(id);
      const [o] = await sql`SELECT id, phone, ip FROM orders WHERE id = ${orderId}`;
      if (!o) {
        await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "অর্ডারটি পাওয়া যায়নি (মুছে ফেলা হয়েছে)" });
        return Response.json({ ok: true });
      }

      // ✏️ এডিট: ki bodlabe tar menu; field e chaple bot uttor chay (reply e notun lekha)
      if (action === "ed") {
        await tg("answerCallbackQuery", { callback_query_id: cb.id });
        await reply(chatId, `✏️ <b>${orderCode(orderId, settings.brand)}</b> — কী বদলাবেন?`, {
          reply_parameters: { message_id: cb.message.message_id, allow_sending_without_reply: true },
          reply_markup: { inline_keyboard: editMenu(orderId, settings) },
        });
        return Response.json({ ok: true });
      }
      if (action === "ef" && EDIT_FIELDS[status]) {
        await tg("answerCallbackQuery", { callback_query_id: cb.id });
        const f = EDIT_FIELDS[status];
        const [cur] = await sql`SELECT name, phone, address, total, note FROM orders WHERE id = ${orderId}`;
        const old = String(cur?.[status] ?? "");
        const head = `${f.ask} — <b>${orderCode(orderId, settings.brand)}</b>\nএখনকার: <code>${esc(old)}</code>`;
        // "✏️ আগেরটা এডিট" chaple ager lekha (tag shoho) lekhar ghore chole ashe — bodle pathalei hoy
        const prefill = `#${orderId} ${f.tag}: ${old}`;
        const sent = prefill.length <= 250 && await reply(chatId, `${head}\n\n👇 নিচের বাটন চাপলে আগের লেখা লেখার ঘরে চলে আসবে — দরকারি অংশ বদলে পাঠিয়ে দিন।\n<code>edit:${orderId}:${status}</code>`, {
          reply_markup: { inline_keyboard: [
            [{ text: `✏️ আগের ${f.label.replace(/^\S+\s/, "")} এডিট করুন`, switch_inline_query_current_chat: prefill }],
            [{ text: "📋 কপি করুন", copy_text: { text: old.slice(0, 256) || "-" } }],
          ] },
        });
        // Bot er inline mode bondho thakle oi button jay na — tokhon ager moto reply e likhte boli
        if (!sent?.ok) {
          await reply(chatId, `${head}\n(এখনকার লেখায় চাপ দিলে কপি হবে — এই মেসেজের রিপ্লাই দিয়ে নতুনটা লিখুন)\n<code>edit:${orderId}:${status}</code>`, {
            reply_markup: { force_reply: true, input_field_placeholder: f.ask },
          });
        }
        return Response.json({ ok: true });
      }
      if (action === "ea") {
        const res = await editOrder(orderId, "area", status, settings);
        await tg("answerCallbackQuery", { callback_query_id: cb.id, text: res.error || res.toast, show_alert: Boolean(res.error || res.warning) });
        if (!res.error) await tg("editMessageText", { chat_id: chatId, message_id: cb.message.message_id, parse_mode: "HTML", text: `✅ ${res.toast}${res.warning ? `\n⚠️ ${res.warning}` : ""}` });
        return Response.json({ ok: true });
      }

      let toast = "";
      if (action === "st"&& STATUSES.some((s) => s.id === status)) {
        await sql`UPDATE orders SET status = ${status} WHERE id = ${orderId}`;
        // কনফার্ম e Facebook Purchase, রিটার্ন e OrderReturned
        after(() => afterStatusChange(orderId, status));
        toast = `স্ট্যাটাস: ${STATUSES.find((s) => s.id === status).label}`;
        // কনফার্ম korle nije theke courier e entry
        if (status === "confirmed") {
          const auto = await autoSendOnConfirm(orderId);
          if (auto?.error) {
            await tg("answerCallbackQuery", { callback_query_id: cb.id, text: `✅ কনফার্ম হয়েছে\n${autoSendText(auto)}`, show_alert: true });
            await trackMessage(orderId, chatId, cb.message.message_id);
            await syncOrder(orderId, { fromTelegram: true });
            revalidatePath("/admin", "layout");
            return Response.json({ ok: true });
          }
          if (auto) toast = `✅ কনফার্ম + ${autoSendText(auto)}`;
        }
      } else if (action === "bl") {
        const reason = `ফেক অর্ডার #${orderId} (Telegram)`;
        await sql`INSERT INTO blocked (kind, value, reason) VALUES ('phone', ${o.phone}, ${reason}) ON CONFLICT DO NOTHING`;
        if (o.ip) await sql`INSERT INTO blocked (kind, value, reason) VALUES ('ip', ${o.ip}, ${reason}) ON CONFLICT DO NOTHING`;
        await sql`UPDATE orders SET status = 'cancelled' WHERE id = ${orderId}`;
        toast = "🚫 নাম্বার ও IP ব্লক, অর্ডার বাতিল";
      } else if (action === "cr" || action === "sf") {
        // "sf:ID" purono Steadfast button, "cr:ID:courier" notun
        const courier = action === "sf" ? "steadfast" : status;
        try {
          const { tracking } = await sendOrderToCourier(orderId, courier);
          toast = `${COURIERS[courier].icon} ${COURIERS[courier].name} এ পাঠানো হয়েছে — ট্র্যাকিং ${tracking}`;
        } catch (err) {
          console.error("Courier send failed", courier, orderId, err.message);
          await tg("answerCallbackQuery", { callback_query_id: cb.id, text: `❌ ${err.message}`, show_alert: true });
          return Response.json({ ok: true, error: err.message });
        }
      } else if (action === "ub") {
        await sql`DELETE FROM blocked WHERE (kind = 'phone' AND value = ${o.phone}) OR (kind = 'ip' AND value = ${o.ip || "-"})`;
        toast = "✅ আনব্লক করা হয়েছে";
      }

      await tg("answerCallbackQuery", { callback_query_id: cb.id, text: toast || "ঠিক আছে" });
      // Je card e button chaapa hoyeche sheta i ei chat er card hishebe dhori, jate seta update hoy
      await trackMessage(orderId, chatId, cb.message.message_id);
      await syncOrder(orderId, { fromTelegram: true });
      revalidatePath("/admin", "layout");
      return Response.json({ ok: true });
    }

    /* ---------- Command / message ---------- */
    const msg = update.message;
    if (!msg?.text) return Response.json({ ok: true });
    const chatId = String(msg.chat.id);
    const [cmd, arg] = msg.text.trim().split(/\s+/);
    const command = cmd.split("@")[0].toLowerCase();

    // Link kaj na korle shudhu code ta likhe pathalei connect hoy
    if (command === linkCode().toLowerCase() && !chats.includes(chatId)) {
      await addChat(chatId);
      await sendHelp(chatId, `✅ <b>${settings.brand}</b> এর অর্ডার নোটিফিকেশন চালু হয়েছে!\n\n`);
      return Response.json({ ok: true });
    }

    if (command === "/start") {
      if (arg && arg === linkCode()) {
        await addChat(chatId);
        await sendHelp(chatId, `✅ <b>${settings.brand}</b> এর অর্ডার নোটিফিকেশন চালু হয়েছে!\n\n`);
      } else if (chats.includes(chatId)) {
        await sendHelp(chatId);
      } else {
        await reply(chatId, "🔒 অনুমতি নেই। অ্যাডমিন প্যানেল → Telegram পেজে যে কানেক্ট কোড আছে, সেটা এখানে লিখে পাঠান।");
      }
      return Response.json({ ok: true });
    }

    if (!chats.includes(chatId)) {
      await reply(chatId, "🔒 অনুমতি নেই। অ্যাডমিন প্যানেল → Telegram পেজে যে কানেক্ট কোড আছে, সেটা এখানে লিখে পাঠান।");
      return Response.json({ ok: true });
    }

    // ➕ নতুন অর্ডার button / command
    if (command === "/new" || msg.text.trim() === NEW_BTN) {
      await newOrderStep(chatId, "mo:s", settings);
      return Response.json({ ok: true });
    }

    // Notun order er shesh dhap: bot er "কাস্টমারের তথ্য" message er reply
    const draft = msg.reply_to_message?.from?.is_bot && String(msg.reply_to_message.text || "").match(/new:(\d+):(\d+):(\w+)\s*$/);
    if (draft) {
      const c = parseCustomer(msg.text);
      const res = await createManualOrder({
        ...c, productId: draft[1], qty: draft[2], areaId: draft[3], note: "📞 ম্যানুয়াল অর্ডার (Telegram)",
      });
      if (res.error) {
        await reply(chatId, `❌ ${res.error}\nউপরের মেসেজের রিপ্লাই দিয়ে আবার লিখুন (নাম, নাম্বার, ঠিকানা আলাদা লাইনে)।`);
        return Response.json({ ok: true });
      }
      await tg("deleteMessage", { chat_id: chatId, message_id: msg.reply_to_message.message_id });
      await reply(chatId, `✅ অর্ডার <b>${orderCode(res.id, settings.brand)}</b> বসানো হয়েছে — মোট ${taka(res.total)}\nনিচের কার্ড থেকে কনফার্ম করুন।`, { reply_markup: MAIN_KEYBOARD });
      revalidatePath("/admin", "layout");
      after(() => notifyNewOrder(res.id));
      return Response.json({ ok: true });
    }

    // "✏️ আগের ... এডিট" button theke ana lekha bodle pathano (reply chara-i)
    const pre = parsePrefilled(msg.text);
    if (pre) {
      const res = await editOrder(pre.id, pre.field, pre.value, settings);
      await reply(chatId, res.error ? `❌ ${res.error}\nআবার "✏️ এডিট" বাটন চেপে চেষ্টা করুন।` : `✅ ${res.toast}${res.warning ? `\n⚠️ ${res.warning}` : ""}`);
      return Response.json({ ok: true });
    }

    // Bot er "notun ... likhun" message er reply → order er oi tottho bodlay
    const asked = msg.reply_to_message?.from?.is_bot && String(msg.reply_to_message.text || "").match(/edit:(\d+):(\w+)\s*$/);
    if (asked && EDIT_FIELDS[asked[2]]) {
      const res = await editOrder(Number(asked[1]), asked[2], msg.text, settings);
      if (res.error) {
        await reply(chatId, `❌ ${res.error}\nআবার চেষ্টা করুন: উপরের মেসেজের রিপ্লাই দিন।`);
      } else {
        await tg("deleteMessage", { chat_id: chatId, message_id: msg.reply_to_message.message_id });
        await reply(chatId, `✅ ${res.toast}${res.warning ? `\n⚠️ ${res.warning}` : ""}`);
      }
      return Response.json({ ok: true });
    }

    if (command === "/stop") {
      await removeChat(chatId);
      await reply(chatId, "🔕 এই চ্যাটে নোটিফিকেশন বন্ধ করা হয়েছে। আবার চালু করতে অ্যাডমিন প্যানেলের লিংক ব্যবহার করুন।");
    } else if (command === "/today") {
      await reply(chatId, await summaryText("today"));
    } else if (command === "/stats") {
      await reply(chatId, await summaryText("all"));
    } else if (command in LIST_COMMANDS || command === "/orders") {
      const status = LIST_COMMANDS[command];
      const label = status ? STATUSES.find((s) => s.id === status).label : "সর্বশেষ";
      const [{ n }] = status
        ? await sql`SELECT count(*)::int AS n FROM orders WHERE status = ${status}`
        : await sql`SELECT count(*)::int AS n FROM orders`;
      const rows = status
        ? await sql`SELECT id FROM orders WHERE status = ${status} ORDER BY created_at DESC LIMIT ${MAX_CARDS}`
        : await sql`SELECT id FROM orders ORDER BY created_at DESC LIMIT ${MAX_CARDS}`;
      if (!rows.length) {
        await reply(chatId, `✅ কোনো ${label} অর্ডার নেই`);
      } else {
        await reply(chatId, `📋 <b>${label} অর্ডার: মোট ${n}টি</b>${n > MAX_CARDS ? ` (সর্বশেষ ${MAX_CARDS}টি দেখানো হলো)` : ""}`);
        // Purono theke notun — sobcheye notun ta niche thake
        for (const r of rows.reverse()) await sendOrderCard(r.id, chatId, settings);
      }
    } else if (command === "/order") {
      const q = String(arg || "").trim();
      if (!q) {
        await reply(chatId, "লিখুন: <code>/order VE000012</code> বা <code>/order 12</code> বা <code>/order 017XXXXXXXX</code>");
      } else {
        const id = /^\d{1,9}$/.test(q) ? Number(q) : /^[a-z]{1,2}\d+$/i.test(q) ? Number(q.replace(/\D/g, "")) : 0;
        const rows = /^01\d{9}$/.test(q)
          ? await sql`SELECT id FROM orders WHERE phone = ${q} ORDER BY created_at DESC LIMIT 5`
          : await sql`SELECT id FROM orders WHERE id = ${id}`;
        if (!rows.length) await reply(chatId, `❌ "${q}" নামে কোনো অর্ডার পাওয়া যায়নি`);
        for (const r of rows.reverse()) await sendOrderCard(r.id, chatId, settings);
      }
    } else {
      await sendHelp(chatId);
    }
  } catch (err) {
    console.error("Telegram webhook failed", err);
  }
  return Response.json({ ok: true });
}
