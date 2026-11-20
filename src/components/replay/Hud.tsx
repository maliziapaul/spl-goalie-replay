"use client";

import { AnimatePresence, motion } from "motion/react";
import { META, PUCK, sample } from "@/lib/goalie/data";
import { useReplay } from "@/lib/goalie/store";

/** Shot id, clock and tracking state, laid over the top-left of the stage. */
export function Hud() {
  const shot = useReplay((s) => s.shot);
  const f = useReplay((s) => s.f);
  const lost = useReplay((s) => {
    const sh = s.shots?.[s.shot];
    return !!sh && s.f >= 1 && Number.isNaN(sample(sh, s.f, PUCK));
  });
  const m = META[shot];
  const t = f / m.hz;
  const rel = (f - m.rel) / m.hz;
  return (
    <div className="pointer-events-none absolute top-3 left-[max(12px,env(safe-area-inset-left))] flex flex-col gap-0.5">
      <div className="relative h-10 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={m.id}
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -28, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="font-display text-[40px] leading-[0.95] font-bold tracking-wide"
          >
            {m.id}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="font-mono text-xs text-muted-foreground tabular-nums">
        t = <b className="font-medium text-foreground">{t.toFixed(2)} s</b> · {rel >= 0 ? "+" : "−"}
        {Math.abs(rel).toFixed(2)} s from release
      </div>
      {lost && <div className="font-mono text-[11px] text-speed-hi">Puck hidden from the cameras</div>}
    </div>
  );
}

/** Red wash over the stage for the first second after the puck crosses into the net. */
export function GoalFlash() {
  const lit = useReplay((s) => {
    const sh = s.shots?.[s.shot];
    return !!sh && sh.goalFrame >= 0 && s.f >= sh.goalFrame && s.f < sh.goalFrame + 70;
  });
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 shadow-[inset_0_0_120px_rgba(255,59,48,0.55)]"
      initial={false}
      animate={{ opacity: lit ? 1 : 0 }}
      transition={{ duration: lit ? 0.12 : 0.6 }}
    />
  );
}
