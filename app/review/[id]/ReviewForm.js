"use client";

import { useActionState, useState } from "react";
import { submitReview } from "./actions";

const LABELS = ["", "😞 ভালো লাগেনি", "😐 মোটামুটি", "🙂 ভালো", "😊 খুব ভালো", "🤩 অসাধারণ!"];

export default function ReviewForm({ id, k }) {
  const [rating, setRating] = useState(5);
  const [state, action, pending] = useActionState(submitReview, null);
  return (
    <form action={action} className="rv-form">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="k" value={k} />
      <input type="hidden" name="rating" value={rating} />
      <div className="rv-stars" role="radiogroup" aria-label="রেটিং">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" className={n <= rating ? "on" : ""} onClick={() => setRating(n)} aria-label={`${n} তারা`}>★</button>
        ))}
      </div>
      <p className="rv-label">{LABELS[rating]}</p>
      <textarea name="text" rows={4} maxLength={400} placeholder="সুগন্ধ, প্যাকেজিং, ডেলিভারি — আপনার অভিজ্ঞতা লিখুন (ইচ্ছা হলে)" />
      {state?.error && <p className="rv-err">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? "পাঠানো হচ্ছে..." : "রিভিউ পাঠান"}</button>
    </form>
  );
}
