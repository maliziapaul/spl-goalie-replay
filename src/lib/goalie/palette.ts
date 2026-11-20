import * as THREE from "three";
import type { Outcome } from "./data";

/** Same values as the CSS tokens in globals.css, for use inside the WebGL scene. */
export const PALETTE = {
  arena: "#0b1119",
  goalie: "#9142e6", // SPL's default goalie colour (#841FD1), lifted for the dark ground
  pad: "#f1eef7",
  goal: "#ff3b30",
  save: "#46c9a7",
  wide: "#6f7b8f",
  lo: "#5aa9ff",
  mid: "#e8edf4",
  hi: "#ffae1f",
  muted: "#8e9bb0",
} as const;

const C = {
  lo: new THREE.Color(PALETTE.lo),
  mid: new THREE.Color(PALETTE.mid),
  hi: new THREE.Color(PALETTE.hi),
  goal: new THREE.Color(PALETTE.goal),
  save: new THREE.Color(PALETTE.save),
  wide: new THREE.Color(PALETTE.wide),
};

export const SPEED_MIN = 40;
export const SPEED_MAX = 140;

export function speedColor(v: number, out = new THREE.Color()) {
  const t = Math.max(0, Math.min(1, (v - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)));
  return t < 0.55 ? out.copy(C.lo).lerp(C.mid, t / 0.55) : out.copy(C.mid).lerp(C.hi, (t - 0.55) / 0.45);
}

export const speedHex = (v: number) => "#" + speedColor(v).getHexString();

export function outcomeColor(o: Outcome) {
  return o === "goal" ? C.goal : o === "save" ? C.save : C.wide;
}

export const OUTCOME_LABEL: Record<Outcome, string> = { goal: "Goal", save: "Stopped", wide: "Wide" };
