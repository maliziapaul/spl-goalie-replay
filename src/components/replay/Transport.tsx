"use client";

import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useReplay } from "@/lib/goalie/store";

const RATES = [0.1, 0.25, 0.5, 1];

export function Transport() {
  const playing = useReplay((s) => s.playing);
  const rate = useReplay((s) => s.rate);
  const autoNext = useReplay((s) => s.autoNext);
  const { togglePlay, select, setRate, setAutoNext } = useReplay.getState();
  const shot = useReplay((s) => s.shot);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="icon-lg" aria-label="Previous shot" onClick={() => select(shot - 1, true)}>
        <SkipBack />
      </Button>
      <Button size="lg" className="min-w-24 font-semibold" onClick={togglePlay}>
        {playing ? <Pause /> : <Play />}
        {playing ? "Pause" : "Play"}
      </Button>
      <Button variant="secondary" size="icon-lg" aria-label="Next shot" onClick={() => select(shot + 1, true)}>
        <SkipForward />
      </Button>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={String(rate)}
        onValueChange={(v) => v && setRate(Number(v))}
        aria-label="Playback speed"
        className="ml-1"
      >
        {RATES.map((r) => (
          <ToggleGroupItem key={r} value={String(r)} className="font-mono text-[11.5px]">
            {r}×
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="ml-1 flex items-center gap-2">
        <Switch id="auto-next" checked={autoNext} onCheckedChange={setAutoNext} />
        <Label htmlFor="auto-next" className="text-xs font-normal text-muted-foreground">
          Play the session
        </Label>
      </div>
      <span className="ml-auto hidden font-mono text-[10.5px] text-muted-foreground lg:inline">
        Space play · ← → step a frame · N / P next or previous shot
      </span>
    </div>
  );
}
