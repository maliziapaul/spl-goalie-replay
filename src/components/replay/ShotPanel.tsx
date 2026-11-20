"use client";

import { useEffect } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { META, ftsToKmh, ftsToMph, outcomeOf, type Outcome, type ShotMeta } from "@/lib/goalie/data";
import { OUTCOME_LABEL, SPEED_MAX, SPEED_MIN } from "@/lib/goalie/palette";
import { useReplay } from "@/lib/goalie/store";
import { cn } from "@/lib/utils";

const OUTCOME_CLASS: Record<Outcome, string> = {
  goal: "bg-goal text-white border-transparent",
  save: "bg-save/15 text-save border-save/40",
  wide: "bg-wide/15 text-[#b6c0cf] border-wide/45",
};

function CountUp({ value }: { value: number }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => Math.round(v).toString());
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.6, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [mv, value]);
  return <motion.b className="font-display text-[64px] leading-[0.9] font-bold tabular-nums">{text}</motion.b>;
}

function stats(s: ShotMeta) {
  const drop =
    s.drop == null
      ? { v: "stayed up", u: "" }
      : (() => {
          const ms = Math.round(((s.drop - s.rel) * 1000) / s.hz);
          return ms === 0 ? { v: "at release", u: "" } : { v: `${ms > 0 ? "+" : "−"}${Math.abs(ms)}`, u: `ms ${ms > 0 ? "after" : "before"}` };
        })();
  return [
    { k: "Distance from net", v: s.dist?.toFixed(1) ?? "–", u: "ft" },
    { k: "Angle off centre", v: s.angle != null ? `${Math.round(s.angle)}°` : "–", u: s.origin && s.origin[1] < 0 ? "goalie's left" : "goalie's right" },
    { k: "Butterfly drop", ...drop },
    { k: "Lowest hip height", v: s.minHip.toFixed(2), u: `ft (stance ${s.hip0.toFixed(2)})` },
    { k: "Goalie travel on the pass", v: s.travel.toFixed(1), u: "ft" },
    { k: "Puck tracked", v: `${Math.round(s.vis * 100)}%`, u: "of frames" },
  ];
}

export function ShotPanel() {
  const s = META[useReplay((st) => st.shot)];
  const o = outcomeOf(s);
  const pos = Math.max(0, Math.min(1, (s.speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)));
  return (
    <Card className="gap-4 border-0 bg-transparent py-0 shadow-none ring-0">
      <CardHeader className="flex items-center justify-between px-0">
        <CardTitle className="font-mono text-[10.5px] font-normal tracking-[0.12em] text-muted-foreground uppercase">Release speed</CardTitle>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={s.id} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.2 }}>
            <Badge variant="outline" className={cn("h-6 rounded-sm px-2.5 font-display text-[15px] font-bold tracking-[0.08em] uppercase", OUTCOME_CLASS[o])}>
              {OUTCOME_LABEL[o]}
            </Badge>
          </motion.div>
        </AnimatePresence>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 px-0">
        <div>
          <div className="flex items-baseline gap-2">
            <CountUp value={s.speed} />
            <span className="font-mono text-xs leading-normal text-muted-foreground">
              ft/s
              <br />
              {Math.round(ftsToMph(s.speed))} mph · {Math.round(ftsToKmh(s.speed))} km/h
            </span>
          </div>
          <div className="relative mt-2 h-1 rounded-full bg-[linear-gradient(90deg,var(--speed-lo),var(--speed-mid)_55%,var(--speed-hi))]" aria-hidden>
            <motion.i
              className="absolute -top-1 block h-3 w-0.5 rounded-full bg-foreground"
              initial={false}
              animate={{ left: `calc(${pos * 100}% - 1px)` }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            />
          </div>
        </div>
        <motion.dl
          key={s.id}
          className="m-0 grid grid-cols-2 gap-x-3.5 gap-y-3"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
        >
          {stats(s).map((r) => (
            <motion.div key={r.k} className="min-w-0" variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0 } }}>
              <dt className="mb-0.5 text-[11px] text-muted-foreground">{r.k}</dt>
              <dd className="m-0 font-mono text-sm tabular-nums">
                {r.v} {r.u && <small className="text-[11px] text-muted-foreground">{r.u}</small>}
              </dd>
            </motion.div>
          ))}
        </motion.dl>
      </CardContent>
    </Card>
  );
}
