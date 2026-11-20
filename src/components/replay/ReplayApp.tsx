"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "motion/react";
import { META, SESSION, loadShots } from "@/lib/goalie/data";
import { useReplay } from "@/lib/goalie/store";
import { GoalFlash, Hud } from "./Hud";
import { CameraPicker, LayerPicker } from "./StageControls";
import { Transport } from "./Transport";
import { Timeline } from "./Timeline";
import { ShotStrip } from "./ShotStrip";
import { ShotPanel } from "./ShotPanel";
import { NetFace } from "./NetFace";
import { SessionSummary } from "./SessionSummary";

// WebGL only runs in the browser, so the scene is not prerendered.
const Stage = dynamic(() => import("./scene/Stage"), { ssr: false });

function useLoadShots() {
  useEffect(() => {
    let alive = true;
    loadShots()
      .then((shots) => alive && useReplay.getState().setShots(shots))
      .catch(() => alive && useReplay.getState().setError("The tracking data did not load. Reload the page to try again."));
    return () => { alive = false; };
  }, []);
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, select, textarea, [role=slider]")) return;
      const s = useReplay.getState();
      if (e.key === " " && !t.closest("button")) { e.preventDefault(); s.togglePlay(); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowRight") { if (t === document.body) { e.preventDefault(); s.step(e.key === "ArrowLeft" ? -1 : 1); } }
      else if (e.key === "n" || e.key === "N") s.select(s.shot + 1, true);
      else if (e.key === "p" || e.key === "P") s.select(s.shot - 1, true);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);
}

export function ReplayApp() {
  useLoadShots();
  useShortcuts();
  const reduce = useReducedMotion();
  const ready = useReplay((s) => !!s.shots);
  const error = useReplay((s) => s.error);

  // With reduced motion, open paused just after the release instead of auto-playing.
  useEffect(() => {
    if (!reduce) return;
    const s = useReplay.getState();
    useReplay.setState({ playing: false, f: META[s.shot].rel + 6 });
  }, [reduce]);

  return (
    <div className="grid min-h-dvh grid-cols-1 lg:h-dvh lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_minmax(0,1fr)_auto]">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border px-[max(16px,env(safe-area-inset-left))] pt-3 pb-2.5 lg:col-span-2">
        <h1 className="font-display text-[28px] leading-none font-bold tracking-wide uppercase">
          SPL Open Data <span className="text-goalie">Goalie Replay</span>
        </h1>
        <p className="font-mono text-[11px] tracking-wide text-muted-foreground">
          Goalie {SESSION.participant} · session {SESSION.date} · {META.length} shots · 60 fps markerless pose + puck tracking
        </p>
      </header>

      <section className="relative h-[58vh] min-h-[340px] overflow-hidden lg:h-auto lg:min-h-0" aria-label="3D replay of the goalie and puck">
        <Stage />
        <Hud />
        <CameraPicker />
        <LayerPicker />
        <GoalFlash />
        {!ready && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-background p-4 text-center font-mono text-xs tracking-widest text-muted-foreground uppercase">
            {error ?? `Loading ${META.length} tracked shots…`}
          </div>
        )}
      </section>

      <section className="flex min-w-0 flex-col gap-2.5 border-t border-border bg-card px-[max(16px,env(safe-area-inset-left))] pt-2.5 pb-3 lg:pr-4" aria-label="Playback">
        <Transport />
        <Timeline />
        <ShotStrip />
      </section>

      <aside
        className="flex min-h-0 flex-col gap-5 overflow-y-auto *:shrink-0 border-t border-border bg-card py-4 pr-[max(16px,env(safe-area-inset-right))] pl-[max(16px,env(safe-area-inset-left))] lg:col-start-2 lg:row-span-2 lg:row-start-2 lg:border-t-0 lg:border-l lg:pl-[18px]"
        aria-label="Shot details"
      >
        <ShotPanel />
        <NetFace />
        <SessionSummary />
        <footer className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
          Data:{" "}
          <a className="underline underline-offset-2" href="https://github.com/Sport-Performance-Lab/SPL-Open-Data/tree/main/hockey/goalie" target="_blank" rel="noopener noreferrer">
            SPL Open Data, hockey goalie dataset
          </a>{" "}
          by MLSE&apos;s Sport Performance Lab, puck tracking by Stathletes, licensed{" "}
          <a className="underline underline-offset-2" href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener noreferrer">
            CC BY-NC-SA 4.0
          </a>
          . Outcomes, aim points and butterfly timing are derived here from the tracking and are not official labels.
          Independent visualization, not affiliated with MLSE or Stathletes.
        </footer>
      </aside>
    </div>
  );
}
