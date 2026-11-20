"use client";

import { motion } from "motion/react";
import { META, outcomeOf } from "@/lib/goalie/data";
import { PALETTE } from "@/lib/goalie/palette";
import { useReplay } from "@/lib/goalie/store";

// Shooter's view of the goal mouth (6 ft x 4 ft), 10 SVG units per foot.
// Looking from the slot toward +x, the goalie's left (negative y) is on the viewer's right.
const nx = (y: number) => -y * 10;
const nz = (z: number) => 70 - z * 10;
const COLOR = { goal: PALETTE.goal, save: PALETTE.save, wide: PALETTE.wide };
const DOTS = META.map((s, i) => ({
  i,
  id: s.id,
  speed: s.speed,
  o: outcomeOf(s),
  x: s.place ? Math.max(-78, Math.min(78, nx(s.place[0]))) : null,
  y: s.place ? Math.max(-8, Math.min(70, nz(s.place[1]))) : null,
}));

export function NetFace() {
  const current = useReplay((s) => s.shot);
  const select = useReplay((s) => s.select);
  const cur = DOTS[current];
  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-[10.5px] tracking-[0.12em] text-muted-foreground uppercase">Where shots were aimed</h2>
        <span className="font-mono text-[10.5px] text-muted-foreground">Shooter&apos;s view</span>
      </div>
      <svg viewBox="-80 -10 160 92" className="block h-auto w-full" role="img" aria-label="Goal mouth with the aim point of every shot">
        <rect x={-80} y={70} width={160} height={3} fill="#2a3647" />
        <path d={`M${nx(3)},${nz(0)} V${nz(4)} H${nx(-3)} V${nz(0)}`} fill="rgba(255,255,255,0.04)" stroke="#d42a2a" strokeWidth={1.6} />
        {[1, 2, 3, 4, 5].map((k) => <line key={`v${k}`} x1={nx(3 - k)} x2={nx(3 - k)} y1={nz(0)} y2={nz(4)} stroke="rgba(255,255,255,0.07)" />)}
        {[1, 2, 3].map((k) => <line key={`h${k}`} x1={nx(3)} x2={nx(-3)} y1={nz(k)} y2={nz(k)} stroke="rgba(255,255,255,0.07)" />)}
        <text x={-50} y={80} textAnchor="middle" fill={PALETTE.muted} fontSize={6} className="font-mono">goalie&apos;s right</text>
        <text x={50} y={80} textAnchor="middle" fill={PALETTE.muted} fontSize={6} className="font-mono">goalie&apos;s left</text>
        {DOTS.map((d) =>
          d.x == null ? null : (
            <motion.circle
              key={d.id}
              cx={d.x}
              cy={d.y!}
              fill={COLOR[d.o]}
              fillOpacity={0.85}
              className="cursor-pointer"
              initial={{ r: 0 }}
              animate={{ r: 2.6 }}
              transition={{ delay: 0.2 + d.i * 0.01, type: "spring", stiffness: 300, damping: 18 }}
              onClick={() => select(d.i, true)}
            >
              <title>{`${d.id} · ${Math.round(d.speed)} ft/s`}</title>
            </motion.circle>
          ),
        )}
        {cur.x != null && (
          <motion.circle
            r={5.5}
            fill="none"
            stroke="#fff"
            strokeWidth={1.4}
            pointerEvents="none"
            initial={false}
            animate={{ cx: cur.x, cy: cur.y! }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          />
        )}
      </svg>
      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
        Each dot is a shot&apos;s straight-line path at release, carried to the goal line. Red ended in the net, green were
        stopped, grey ended wide. Click a dot to replay that shot.
      </p>
    </section>
  );
}
