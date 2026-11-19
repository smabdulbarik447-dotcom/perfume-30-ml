"use client";

import { useEffect } from "react";

// Admin e kono page bhenge gele shada screen na — "আবার চেষ্টা" ar karon bojhar ishara
export default function AdminError({ error, reset }) {
  useEffect(() => console.error("Admin page error", error), [error]);
  return (
    <div className="adm-box" style={{ textAlign: "center", padding: 30 }}>
      <h2>😕 পেজটা খুলতে সমস্যা হলো</h2>
      <p className="adm-muted">আবার চেষ্টা করুন। ব্রাউজারের “Translate / অনুবাদ” চালু থাকলে বন্ধ করে দিন।</p>
      <button type="button" className="adm-btn" onClick={() => reset()}>🔄 আবার চেষ্টা করুন</button>
      {error?.digest && <p className="adm-muted">কোড: {error.digest}</p>}
    </div>
  );
}
