"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CAMS, CAM_ORDER } from "@/lib/goalie/cams";
import { useReplay, type CamPreset, type Layer } from "@/lib/goalie/store";

const chip =
  "h-7 rounded-md border border-border bg-card/90 px-2.5 text-xs text-foreground backdrop-blur hover:bg-secondary hover:text-foreground data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground";

export function CameraPicker() {
  const cam = useReplay((s) => s.cam);
  const setCam = useReplay((s) => s.setCam);
  return (
    <ToggleGroup
      type="single"
      spacing={4}
      value={cam === "free" ? "" : cam}
      onValueChange={(v) => v && setCam(v as CamPreset)}
      aria-label="Camera"
      className="absolute top-3 right-3 max-w-[70%] flex-wrap justify-end"
    >
      {CAM_ORDER.map((c) => (
        <ToggleGroupItem key={c} value={c} className={chip}>
          {CAMS[c].label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

const LAYERS: { id: Layer; label: string }[] = [
  { id: "ghost", label: "Motion trail" },
  { id: "path", label: "Puck path" },
  { id: "all", label: "All 81 shots" },
];

export function LayerPicker() {
  const layers = useReplay((s) => s.layers);
  const toggle = useReplay((s) => s.toggleLayer);
  const value = LAYERS.filter((l) => layers[l.id]).map((l) => l.id);
  return (
    <ToggleGroup
      type="multiple"
      spacing={4}
      value={value}
      onValueChange={(next) => LAYERS.forEach((l) => { if (next.includes(l.id) !== layers[l.id]) toggle(l.id); })}
      aria-label="Layers"
      className="absolute right-3 bottom-3 flex-wrap justify-end"
    >
      {LAYERS.map((l) => (
        <ToggleGroupItem key={l.id} value={l.id} className={chip}>
          {l.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
