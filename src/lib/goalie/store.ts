import { create } from "zustand";
import { META, type Shot } from "./data";

export type CamPreset = "slot" | "boards" | "overhead" | "behind" | "free";
export type Layer = "ghost" | "path" | "all";

type ReplayState = {
  shots: Shot[] | null;
  error: string | null;
  shot: number;
  /** playhead in fractional frames; written every animation frame while playing */
  f: number;
  playing: boolean;
  rate: number;
  autoNext: boolean;
  hold: number;
  layers: Record<Layer, boolean>;
  cam: CamPreset;
  setShots: (shots: Shot[]) => void;
  setError: (e: string) => void;
  select: (i: number, play?: boolean) => void;
  setPlaying: (v: boolean) => void;
  togglePlay: () => void;
  step: (d: number) => void;
  scrub: (f: number) => void;
  tick: (dt: number) => void;
  setRate: (r: number) => void;
  setAutoNext: (v: boolean) => void;
  toggleLayer: (l: Layer) => void;
  setCam: (c: CamPreset) => void;
};

const N = META.length;

export const useReplay = create<ReplayState>((set, get) => ({
  shots: null,
  error: null,
  // open on S0010, a goal, so the first replay ends with the lamp on
  shot: Math.max(0, META.findIndex((s) => s.id === "S0010")),
  f: 0,
  playing: true,
  rate: 0.5,
  autoNext: true,
  hold: 0,
  layers: { ghost: true, path: true, all: false },
  cam: "slot",
  setShots: (shots) => set({ shots }),
  setError: (error) => set({ error }),
  select: (i, play) => set((s) => ({ shot: ((i % N) + N) % N, f: 0, hold: 0, playing: play ?? s.playing })),
  setPlaying: (playing) => set({ playing }),
  togglePlay: () => {
    const { playing, f, shot } = get();
    const n = META[shot].n;
    set({ playing: !playing, f: !playing && f >= n - 1 ? 0 : f, hold: 0 });
  },
  step: (d) => {
    const n = META[get().shot].n;
    set({ playing: false, f: Math.max(0, Math.min(n - 1, Math.round(get().f) + d)) });
  },
  scrub: (f) => set({ playing: false, f: Math.max(0, Math.min(META[get().shot].n - 1, f)) }),
  tick: (dt) => {
    const s = get();
    if (!s.playing) return;
    const m = META[s.shot];
    const f = s.f + dt * m.hz * s.rate;
    if (f < m.n - 1) return set({ f });
    const hold = s.hold + dt;
    if (hold < 1.2) return set({ f: m.n - 1, hold });
    if (s.autoNext) s.select(s.shot + 1);
    else set({ f: 0, hold: 0 });
  },
  setRate: (rate) => set({ rate }),
  setAutoNext: (autoNext) => set({ autoNext }),
  toggleLayer: (l) => set((s) => ({ layers: { ...s.layers, [l]: !s.layers[l] } })),
  setCam: (cam) => set({ cam }),
}));
