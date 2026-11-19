"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Icon from "./Icon";

// Bhag kore: bikri, marketing, setup
const MENU = [
  { group: "বিক্রি", href: "/admin", icon: "grid", label: "ড্যাশবোর্ড" },
  { href: "/admin/orders", icon: "orders", label: "অর্ডার", badge: "pending" },
  { href: "/admin/orders/new", icon: "phone", label: "নতুন অর্ডার (কল)" },
  { href: "/admin/incomplete", icon: "clock", label: "অসম্পূর্ণ অর্ডার", badge: "incomplete" },
  { href: "/admin/products", icon: "box", label: "পণ্য" },
  { href: "/admin/products/new", icon: "plus", label: "নতুন পণ্য" },
  { group: "মার্কেটিং", href: "/admin/ads", icon: "megaphone", label: "Facebook অ্যাড", cold: true },
  { href: "/admin/reviews", icon: "star", label: "কাস্টমার রিভিউ", badge: "reviews" },
  { href: "/admin/content", icon: "orders", label: "ল্যান্ডিং পেজ টেক্সট" },
  { href: "/admin/banners", icon: "image", label: "ব্যানার" },
  { group: "সেটআপ", href: "/admin/courier", icon: "truck", label: "কুরিয়ার", cold: true },
  { href: "/admin/fraud", icon: "shield", label: "ফেক অর্ডার প্রোটেকশন" },
  { href: "/admin/telegram", icon: "send", label: "Telegram" },
  { href: "/admin/whatsapp", icon: "phone", label: "WhatsApp মেসেজ" },
  { href: "/admin/tracking", icon: "chart", label: "Pixel / ট্র্যাকিং" },
  { href: "/admin/settings", icon: "sliders", label: "সাইট সেটিংস" },
];

// badges: { pending, incomplete } — kotogulo kaj baki (lal gol chinho)
export default function Sidebar({ badges = {} }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  // "/admin/products/12" (edit) e পণ্য active thakbe, "/admin/products/new" e নতুন পণ্য
  const isActive = (href) =>
    path === href || (href === "/admin/products" && /^\/admin\/products\/\d+$/.test(path));

  return (
    <>
      <button className="adm-burger" onClick={() => setOpen(!open)} aria-label="মেনু">☰ মেনু</button>
      <nav className={`adm-nav ${open ? "open" : ""}`}>
        {MENU.map((m) => [
          m.group && <small key={`g-${m.group}`} className="nav-group">{m.group}</small>,
          <Link key={m.href} href={m.href} prefetch={m.cold ? null : true} className={isActive(m.href) ? "active" : ""} onClick={() => setOpen(false)}>
            <Icon name={m.icon} />
            <span className="nav-label">{m.label}</span>
            {m.badge && badges[m.badge] > 0 && <em className="nav-badge">{badges[m.badge]}</em>}
          </Link>,
        ])}
      </nav>
    </>
  );
}
