"use client";

import { useEffect, useRef } from "react";
import { CH, J, SPD } from "@/lib/goalie/data";
import { PALETTE } from "@/lib/goalie/palette";
import { useReplay } from "@/lib/goalie/store";

/** Puck speed and goalie hip height across the shot, with release and goal markers. Drag to scrub. */
export function Timeline() {
  const box = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const scrub = useReplay((s) => s.scrub);
  const step = useReplay((s) => s.step);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const c = cvs.current, b = box.current;
      const { shots, shot, f } = useReplay.getState();
      const s = shots?.[shot];
      if (!c || !b || !s) return;
      const w = c.clientWidth, h = c.clientHeight, dpr = Math.min(devicePixelRatio, 2);
      if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      const g = c.getContext("2d")!;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const X = (i: number) => (i / (s.n - 1)) * (w - 16) + 8;
      const top = 8, bot = h - 14;
      g.font = "10px var(--font-mono), monospace";
      g.fillStyle = PALETTE.muted;
      for (let sec = 0; sec <= s.n / s.hz; sec++) { const x = X(sec * s.hz); g.fillRect(x, bot, 1, 4); g.fillText(`${sec} s`, x + 3, h - 3); }
      // hip height, 0 to 3.2 ft
      const HY = (z: number) => bot - (z / 3.2) * (bot - top);
      const hip = (i: number) => s.a[i * CH + J.MID_HIP * 3 + 2];
      g.beginPath(); g.moveTo(X(0), bot);
      for (let i = 0; i < s.n; i++) g.lineTo(X(i), HY(hip(i)));
      g.lineTo(X(s.n - 1), bot); g.closePath();
      g.fillStyle = "rgba(145,66,230,0.22)"; g.fill();
      g.beginPath();
      for (let i = 0; i < s.n; i++) {
        if (i) g.lineTo(X(i), HY(hip(i)));
        else g.moveTo(X(i), HY(hip(i)));
      }
      g.strokeStyle = PALETTE.goalie; g.lineWidth = 1.5; g.stroke();
      // puck speed, 0 to 150 ft/s
      const SY = (v: number) => bot - (v / 150) * (bot - top);
      g.beginPath();
      let pen = false;
      for (let i = 0; i < s.n; i++) {
        const v = s.a[i * CH + SPD];
        if (Number.isNaN(v)) { pen = false; continue; }
        if (pen) g.lineTo(X(i), SY(v)); else g.moveTo(X(i), SY(v));
        pen = true;
      }
      g.strokeStyle = PALETTE.hi; g.stroke();
      g.fillStyle = PALETTE.mid; g.fillRect(X(s.rel) - 0.5, top - 4, 1.5, bot - top + 4);
      if (s.goalFrame >= 0) { g.fillStyle = PALETTE.goal; g.fillRect(X(s.goalFrame) - 0.5, top - 4, 2, bot - top + 4); }
      const px = X(f);
      g.fillStyle = "rgba(232,237,244,0.08)"; g.fillRect(8, top - 4, px - 8, bot - top + 4);
      g.fillStyle = "#fff"; g.fillRect(px - 1, 0, 2, bot);
      g.beginPath(); g.arc(px, 4, 4, 0, Math.PI * 2); g.fill();
      b.setAttribute("aria-valuenow", String(Math.round((100 * f) / (s.n - 1))));
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toFrame = (clientX: number) => {
    const r = cvs.current!.getBoundingClientRect();
    const n = useReplay.getState().shots?.[useReplay.getState().shot]?.n ?? 1;
    return ((clientX - r.left - 8) / (r.width - 16)) * (n - 1);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div
        ref={box}
        role="slider"
        tabIndex={0}
        aria-label="Shot timeline"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        className="relative h-[74px] cursor-ew-resize touch-none rounded-md border border-border bg-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); scrub(toFrame(e.clientX)); }}
        onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) scrub(toFrame(e.clientX)); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); step(e.key === "ArrowLeft" ? -1 : 1); }
        }}
      >
        <canvas ref={cvs} className="block size-full" />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <Key color="bg-speed-hi">Puck speed (ft/s)</Key>
        <Key color="bg-goalie">Goalie hip height (ft)</Key>
        <Key color="bg-foreground" tick>Shot release</Key>
        <Key color="bg-goal" tick>Puck in the net</Key>
      </div>
    </div>
  );
}

function Key({ color, tick, children }: { color: string; tick?: boolean; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i className={`${color} inline-block rounded-sm ${tick ? "h-2.5 w-0.5" : "h-[3px] w-3"}`} />
      {children}
    </span>
  );
}
