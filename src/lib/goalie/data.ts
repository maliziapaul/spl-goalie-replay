import * as THREE from "three";
import metaJson from "@/data/goalie-meta.json";

/** Per-shot facts computed by scripts/prep_goalie.py from the tracking (not official labels). */
export type ShotMeta = {
  id: string;
  n: number; // frames
  hz: number; // sampling rate
  rel: number; // release frame
  speed: number; // release speed, ft/s
  goal: boolean; // puck ended inside the net frame
  place: [number, number] | null; // aim point on the goal line: [y, z] ft
  origin: [number, number] | null; // release point: [x, y] ft
  dist: number | null; // release distance to the centre of the goal line, ft
  angle: number | null; // degrees off the centre line
  side: "L" | "R"; // corner the pass came from (goalie's left = negative y)
  drop: number | null; // first frame the hips were below butterfly height
  minHip: number; // lowest hip height after release, ft
  hip0: number; // stance hip height, ft
  travel: number; // goalie hip travel before release, ft
  vis: number; // share of frames with the puck tracked
};

export type Outcome = "goal" | "save" | "wide";

export type Shot = ShotMeta & {
  outcome: Outcome;
  /** frames x CH channels; NaN where the puck was not tracked */
  a: Float32Array;
  /** first frame the puck is inside the net, or -1 */
  goalFrame: number;
};

export const JOINTS = metaJson.joints as string[];
export const J: Record<string, number> = Object.fromEntries(JOINTS.map((n, i) => [n, i]));
export const CH = 61;
export const PUCK = 57;
export const SPD = 60;
export const META = metaJson.shots as unknown as ShotMeta[];
export const SESSION = { date: metaJson.session, participant: metaJson.participant };

/** Aimed on net (inside the 6 ft x 4 ft mouth) and not a goal counts as stopped; otherwise wide. */
export function outcomeOf(s: ShotMeta): Outcome {
  if (s.goal) return "goal";
  const on = s.place && Math.abs(s.place[0]) < 3 && s.place[1] < 4;
  return on ? "save" : "wide";
}

/** Fetch the gzip payload and expand it into one Float32Array per shot. */
export async function loadShots(url = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/data/goalie.bin`): Promise<Shot[]> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Tracking data request failed (${res.status})`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  // The file is gzip. Some servers already decoded it via Content-Encoding; check the magic bytes.
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
  const buf = isGzip
    ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer()
    : bytes.buffer;
  const raw = new Uint16Array(buf);
  let p = 0;
  return META.map((m) => {
    const a = new Float32Array(m.n * CH);
    for (let c = 0; c < CH; c++) {
      let acc = 0;
      const isX = c < 60 && c % 3 === 0;
      const scale = c === SPD ? 10 : 100;
      for (let i = 0; i < m.n; i++) {
        acc = (acc + raw[p++]) & 0xffff;
        const v = acc >= 32768 ? acc - 65536 : acc;
        a[i * CH + c] = v === -32768 ? NaN : v / scale + (isX ? 89 : 0);
      }
    }
    let goalFrame = -1;
    for (let i = m.rel; i < m.n; i++) {
      const o = i * CH + PUCK;
      if (a[o] > 89.2 && a[o] < 93 && Math.abs(a[o + 1]) < 3 && a[o + 2] < 4) {
        goalFrame = i;
        break;
      }
    }
    return { ...m, outcome: outcomeOf(m), a, goalFrame };
  });
}

/** Linear interpolation of one channel at a fractional frame; NaN gaps are not bridged. */
export function sample(s: Shot, f: number, c: number) {
  const i = Math.min(s.n - 1, Math.floor(f));
  const k = Math.min(s.n - 1, i + 1);
  const t = f - i;
  const a = s.a[i * CH + c];
  const b = s.a[k * CH + c];
  if (Number.isNaN(a)) return t > 0.5 ? b : NaN;
  if (Number.isNaN(b)) return t < 0.5 ? a : NaN;
  return a + (b - a) * t;
}

/** Rink data is right-handed with z up, in feet. three.js is y up: (x, y, z) -> (x, z, -y). */
export function toV(x: number, y: number, z: number, out = new THREE.Vector3()) {
  return out.set(x, z, -y);
}

export const ftsToMph = (v: number) => v * 0.681818;
export const ftsToKmh = (v: number) => v * 1.09728;
