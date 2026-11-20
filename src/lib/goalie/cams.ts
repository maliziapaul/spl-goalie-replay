import type { CamPreset } from "./store";

type Preset = Exclude<CamPreset, "free">;

// Camera presets in rink feet [x, y, z]. "From the slot", "Boards" and "Overhead" follow the
// views suggested for animate_shot() in the SPL README.
export const CAMS: Record<Preset, { pos: [number, number, number]; tgt: [number, number, number]; label: string }> = {
  slot: { pos: [64, -4, 11], tgt: [86, 0, 2.2], label: "From the slot" },
  boards: { pos: [84, -26, 5.5], tgt: [85, 0, 2.2], label: "Boards" },
  overhead: { pos: [80.5, 0, 38], tgt: [82, 0, 0], label: "Overhead" },
  behind: { pos: [98.5, 0, 8.5], tgt: [78, 0, 1.2], label: "Behind the net" },
};

export const CAM_ORDER: Preset[] = ["slot", "boards", "overhead", "behind"];
