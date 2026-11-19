"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveNoteAction } from "../actions";

/** নোটপ্যাড — lekha thamle 1 second por nije save (shob device e eki note) */
export function NotePad({ initial }) {
  const [text, setText] = useState(initial);
  const [state, setState] = useState("saved");
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  const onChange = (v) => {
    setText(v);
    setState("typing");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setState("saving");
      const r = await saveNoteAction(v).catch(() => null);
      setState(r?.ok ? "saved" : "error");
    }, 1000);
  };
  return (
    <div className="t-note">
      <textarea value={text} onChange={(e) => onChange(e.target.value)} rows={7} placeholder={"যেমন:\n• কাল সকালে রাকিবকে কল\n• নতুন স্টক আসবে বৃহস্পতিবার"} />
      <small className={`t-note-st ${state}`}>
        {{ saved: "✓ সেভ হয়েছে", typing: "লিখছেন...", saving: "সেভ হচ্ছে...", error: "⚠️ সেভ হয়নি" }[state]}
      </small>
    </div>
  );
}

/** অ্যাড বাজেট ক্যালকুলেটর — din e koto order chai → koto dollar lagbe */
export function AdCalculator({ rate, cpa: initialCpa, confirm: initialConfirm }) {
  const [orders, setOrders] = useState(20);
  const [cpa, setCpa] = useState(initialCpa || 1);
  const [usd, setUsd] = useState(rate || 130);
  const [conf, setConf] = useState(initialConfirm || 80);
  const budget = orders * cpa;
  const confirmed = Math.round((orders * conf) / 100);
  const num = (set) => (e) => set(Math.max(0, Number(e.target.value) || 0));
  return (
    <div className="t-calc">
      <label>দিনে কত অর্ডার চান<input type="number" min="1" value={orders} onChange={num(setOrders)} /></label>
      <label>প্রতি অর্ডারে অ্যাড খরচ ($)<input type="number" min="0" step="0.05" value={cpa} onChange={num(setCpa)} /></label>
      <label>১ ডলার = ৳<input type="number" min="1" value={usd} onChange={num(setUsd)} /></label>
      <label>কনফার্ম রেট (%)<input type="number" min="1" max="100" value={conf} onChange={num(setConf)} /></label>
      <div className="t-calc-out">
        <div><small>দৈনিক বাজেট</small><b>${budget.toFixed(2)}</b><em>≈ ৳{Math.round(budget * usd).toLocaleString("en-IN")}</em></div>
        <div><small>মাসিক (৩০ দিন)</small><b>${(budget * 30).toFixed(0)}</b><em>≈ ৳{Math.round(budget * 30 * usd).toLocaleString("en-IN")}</em></div>
        <div><small>দিনে কনফার্ম হবে</small><b>~{confirmed}টি</b><em>কনফার্মড প্রতি খরচ ৳{confirmed ? Math.round((budget * usd) / confirmed) : 0}</em></div>
      </div>
    </div>
  );
}

const TEMPLATES = [
  { title: "📞 কল ধরেনি", text: "আসসালামু আলাইকুম! {brand} থেকে বলছি। আপনার অর্ডারটি কনফার্ম করতে কল দিয়েছিলাম — সুবিধামতো সময়ে একটু কল ব্যাক করবেন বা এখানে “হ্যাঁ” লিখে দিন 😊" },
  { title: "📍 ঠিকানা লাগবে", text: "আপনার অর্ডারের পার্সেল সঠিকভাবে পৌঁছাতে পূর্ণ ঠিকানা দরকার — বাসা/রোড নং, এলাকা, থানা আর জেলা লিখে দিন প্লিজ 🙏" },
  { title: "🚚 পার্সেল পাঠানো হয়েছে", text: "সুখবর! আপনার পার্সেলটি কুরিয়ারে দেওয়া হয়েছে 🚚 ১–৩ দিনের মধ্যে ডেলিভারি ম্যান কল দেবেন, ফোনটা কাছে রাখবেন। পার্সেল খুলে দেখে টাকা দিতে পারবেন।" },
  { title: "⏳ দেরির জন্য দুঃখিত", text: "দুঃখিত, কুরিয়ারের চাপের কারণে পার্সেল পৌঁছাতে একটু দেরি হচ্ছে 🙏 আমরা খোঁজ রাখছি — খুব শীঘ্রই পেয়ে যাবেন। ধৈর্যের জন্য ধন্যবাদ ❤️" },
  { title: "💜 ধন্যবাদ", text: "পার্সেলটি গ্রহণ করার জন্য অনেক ধন্যবাদ! সুগন্ধ উপভোগ করুন 🌸 কোনো প্রশ্ন থাকলে এখানে জানাবেন — আবার কেনাকাটায় আপনাকে পাবো আশা করি।" },
];

/** দ্রুত মেসেজ — ek click e copy (WhatsApp/Messenger e paste) */
export function QuickMessages({ brand }) {
  const [copied, setCopied] = useState(-1);
  const copy = async (i, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(i);
      setTimeout(() => setCopied(-1), 1500);
    } catch {}
  };
  return (
    <ul className="t-msgs">
      {TEMPLATES.map((m, i) => {
        const text = m.text.replaceAll("{brand}", brand);
        return (
          <li key={m.title}>
            <div><b>{m.title}</b><small>{text}</small></div>
            <button type="button" className={copied === i ? "done" : ""} onClick={() => copy(i, text)}>{copied === i ? "✓ কপি" : "📋 কপি"}</button>
          </li>
        );
      })}
    </ul>
  );
}

/** কাস্টমার খোঁজ — number dile shoja profile */
export function CustomerLookup() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const clean = phone.replace(/\D/g, "").replace(/^88/, "");
  const ok = /^01[3-9]\d{8}$/.test(clean);
  return (
    <form className="t-lookup" onSubmit={(e) => { e.preventDefault(); if (ok) router.push(`/admin/customer/${clean}`); }}>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder="01XXXXXXXXX" />
      <button className="adm-btn" disabled={!ok}>প্রোফাইল দেখুন</button>
      <small>সব অর্ডার, রিসিভ রেট, কুরিয়ার রেটিং আর ব্লক — এক পেজে</small>
    </form>
  );
}
