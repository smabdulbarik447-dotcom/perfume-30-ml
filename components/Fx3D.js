"use client";

import { useEffect } from "react";

// Mouse/angul er dike chobi-card 3D te ghure (sathe alo-r jhilik) — order form e na, jate lekhar shomoy nore na
const TILT = [".gallery-main", ".ex-card", ".spot-img", ".gift-img", ".package-card", ".feature", ".review-card", ".cod-banner", ".compare-item"];
const MAX = { ".gallery-main": 10, ".package-card": 6, ".cod-banner": 5, ".compare-item": 4 };

export default function Fx3D() {
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    // Tilt shudhu mouse e — mobile e angul diye scroll korar shomoy card ghurle lag lage
    if (!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) return;
    const els = TILT.flatMap((sel) => [...document.querySelectorAll(sel)].map((el) => [el, MAX[sel] || 12]));
    const offs = [];
    for (const [el, max] of els) {
      el.classList.add("t3d");
      let raf = 0;
      const move = (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.setProperty("--ry", `${(x - 0.5) * max * 2}deg`);
          el.style.setProperty("--rx", `${(0.5 - y) * max * 2}deg`);
          el.style.setProperty("--mx", `${x * 100}%`);
          el.style.setProperty("--my", `${y * 100}%`);
          el.classList.add("t3d-on");
        });
      };
      const leave = () => {
        cancelAnimationFrame(raf);
        el.classList.remove("t3d-on");
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      el.addEventListener("pointercancel", leave);
      offs.push(() => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); el.removeEventListener("pointercancel", leave); });
    }
    return () => offs.forEach((f) => f());
  }, []);

  // Pichoner bhasha alo/bubble (fixed layer, click nay na)
  return (
    <div className="bg3d" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => <i key={i} />)}
    </div>
  );
}
