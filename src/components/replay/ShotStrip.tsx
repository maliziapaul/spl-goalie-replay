"use client";

import { motion } from "motion/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { META, outcomeOf } from "@/lib/goalie/data";
import { OUTCOME_LABEL, speedHex } from "@/lib/goalie/palette";
import { useReplay } from "@/lib/goalie/store";

/** One cell per shot, coloured by release speed; goals carry a red mark. */
export function ShotStrip() {
  const current = useReplay((s) => s.shot);
  const select = useReplay((s) => s.select);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between gap-2 text-[11px] text-muted-foreground">
        <span>Pass from the goalie&apos;s left corner · S0001–S0041</span>
        <span className="text-right">Pass from the right corner · S0042–S0081</span>
      </div>
      <div className="grid h-[30px] grid-cols-[repeat(81,minmax(0,1fr))] gap-[2px] max-lg:h-6" role="group" aria-label="Pick a shot">
        {META.map((s, i) => {
          const o = outcomeOf(s);
          return (
            <Tooltip key={s.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => select(i, true)}
                  aria-current={i === current}
                  aria-label={`${s.id}, ${Math.round(s.speed)} ft/s, ${OUTCOME_LABEL[o].toLowerCase()}`}
                  className={`relative min-w-0 rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-ring ${i === 41 ? "ml-1.5" : ""}`}
                  style={{ background: speedHex(s.speed) }}
                >
                  {s.goal && <span className="absolute inset-x-0 -top-[5px] h-[3px] rounded-full bg-goal" />}
                  {i === current && (
                    <motion.span
                      layoutId="strip-current"
                      className="absolute -inset-[3px] rounded-[3px] border-2 border-foreground"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="font-mono text-xs">
                {s.id} · {Math.round(s.speed)} ft/s · {OUTCOME_LABEL[o]}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
