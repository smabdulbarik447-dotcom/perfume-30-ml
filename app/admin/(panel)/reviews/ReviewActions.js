"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setReviewApproved, deleteReview } from "../../actions";

export function ReviewActions({ id, approved }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (fn) => startTransition(async () => { await fn(); router.refresh(); });
  return (
    <div className="rvw-actions">
      {approved ? (
        <button type="button" className="adm-btn sm ghost" disabled={pending} onClick={() => run(() => setReviewApproved(id, false))}>🙈 সাইট থেকে লুকান</button>
      ) : (
        <button type="button" className="adm-btn sm" disabled={pending} onClick={() => run(() => setReviewApproved(id, true))}>✅ সাইটে দেখান</button>
      )}
      <button type="button" className="adm-btn sm ghost" disabled={pending} onClick={() => confirm("রিভিউটা মুছবেন?") && run(() => deleteReview(id))}>🗑</button>
    </div>
  );
}
