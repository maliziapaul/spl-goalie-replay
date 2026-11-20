"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CH, J, PUCK, SPD, toV, type Shot } from "@/lib/goalie/data";
import { PALETTE, outcomeColor, speedColor } from "@/lib/goalie/palette";
import { useReplay } from "@/lib/goalie/store";

const LINKS: [string, string][] = [
  ["RIGHT_EYE", "LEFT_EYE"], ["RIGHT_EYE", "NOSE"], ["LEFT_EYE", "NOSE"], ["RIGHT_EYE", "RIGHT_EAR"], ["LEFT_EYE", "LEFT_EAR"],
  ["NOSE", "NECK"], ["NECK", "RIGHT_SHOULDER"], ["NECK", "LEFT_SHOULDER"], ["RIGHT_SHOULDER", "RIGHT_ELBOW"],
  ["LEFT_SHOULDER", "LEFT_ELBOW"], ["RIGHT_ELBOW", "RIGHT_WRIST"], ["LEFT_ELBOW", "LEFT_WRIST"], ["RIGHT_SHOULDER", "RIGHT_HIP"],
  ["LEFT_SHOULDER", "LEFT_HIP"], ["RIGHT_HIP", "LEFT_HIP"], ["RIGHT_HIP", "RIGHT_KNEE"], ["LEFT_HIP", "LEFT_KNEE"],
  ["RIGHT_KNEE", "RIGHT_ANKLE"], ["LEFT_KNEE", "LEFT_ANKLE"], ["NECK", "MID_HIP"],
];

const lineGeo = (pos: number[], col: number[]) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return g;
};

/** Onion-skin stick figures every 6 frames around the release; brightest at the release. */
function ghostGeometry(s: Shot) {
  const pos: number[] = [], col: number[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Color();
  const bg = new THREE.Color(PALETTE.arena), white = new THREE.Color("#ffffff"), purple = new THREE.Color(PALETTE.goalie);
  for (let f = Math.max(0, s.rel - 50); f <= Math.min(s.n - 1, s.rel + 40); f += 6) {
    c.copy(purple).lerp(white, 0.25).lerp(bg, 0.75 - 0.45 * Math.max(0, 1 - Math.abs(f - s.rel) / 50));
    const o = f * CH;
    for (const [na, nb] of LINKS) {
      const ja = J[na] * 3, jb = J[nb] * 3;
      toV(s.a[o + ja], s.a[o + ja + 1], s.a[o + ja + 2], a);
      toV(s.a[o + jb], s.a[o + jb + 1], s.a[o + jb + 2], b);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
  }
  return lineGeo(pos, col);
}

/** Every tracked puck position in the shot, broken where tracking drops out. */
function pathGeometry(s: Shot) {
  const pos: number[] = [], col: number[] = [];
  const v = new THREE.Vector3(), c = new THREE.Color(), bg = new THREE.Color(PALETTE.arena);
  let prev: number[] | null = null;
  for (let i = 0; i < s.n; i++) {
    const o = i * CH + PUCK;
    if (Number.isNaN(s.a[o])) { prev = null; continue; }
    toV(s.a[o], s.a[o + 1], s.a[o + 2] + 0.04, v);
    const sp = s.a[i * CH + SPD];
    speedColor(Number.isNaN(sp) ? 0 : sp, c).lerp(bg, 0.25);
    if (prev) { pos.push(prev[0], prev[1], prev[2], v.x, v.y, v.z); col.push(prev[3], prev[4], prev[5], c.r, c.g, c.b); }
    prev = [v.x, v.y, v.z, c.r, c.g, c.b];
  }
  return lineGeo(pos, col);
}

export function ShotLayers() {
  const s = useReplay((st) => st.shots?.[st.shot]);
  const layers = useReplay((st) => st.layers);
  const ghost = useMemo(() => (s ? ghostGeometry(s) : null), [s]);
  const path = useMemo(() => (s ? pathGeometry(s) : null), [s]);
  useLayoutEffect(() => () => { ghost?.dispose(); path?.dispose(); }, [ghost, path]);
  return (
    <group>
      {ghost && (
        <lineSegments geometry={ghost} visible={layers.ghost}>
          <lineBasicMaterial vertexColors transparent opacity={0.9} />
        </lineSegments>
      )}
      {path && (
        <lineSegments geometry={path} visible={layers.path}>
          <lineBasicMaterial vertexColors transparent opacity={0.8} />
        </lineSegments>
      )}
    </group>
  );
}

/** All 81 shots from release to the net, coloured by outcome, with aim points on the goal line. */
export function AllShots() {
  const shots = useReplay((st) => st.shots);
  const visible = useReplay((st) => st.layers.all);
  const dots = useRef<THREE.InstancedMesh>(null);
  const lines = useMemo(() => {
    if (!shots) return null;
    const pos: number[] = [], col: number[] = [];
    const v = new THREE.Vector3();
    for (const s of shots) {
      const end = Math.min(s.n - 1, s.goalFrame >= 0 ? s.goalFrame + 4 : s.rel + 26);
      const c = outcomeColor(s.outcome);
      let prev: number[] | null = null;
      for (let i = Math.max(0, s.rel - 4); i <= end; i++) {
        const o = i * CH + PUCK;
        if (Number.isNaN(s.a[o])) { prev = null; continue; }
        toV(s.a[o], s.a[o + 1], s.a[o + 2] + 0.04, v);
        if (prev) { pos.push(prev[0], prev[1], prev[2], v.x, v.y, v.z); col.push(c.r, c.g, c.b, c.r, c.g, c.b); }
        prev = [v.x, v.y, v.z];
      }
    }
    return lineGeo(pos, col);
  }, [shots]);

  useLayoutEffect(() => {
    const d = dots.current;
    if (!d || !shots) return;
    const m = new THREE.Matrix4(), v = new THREE.Vector3();
    shots.forEach((s, i) => {
      const [y, z] = s.place ?? [99, 0];
      m.makeTranslation(toV(89, Math.max(-9, Math.min(9, y)), Math.min(7, z), v));
      d.setMatrixAt(i, m);
      d.setColorAt(i, outcomeColor(s.outcome));
    });
    d.instanceMatrix.needsUpdate = true;
    if (d.instanceColor) d.instanceColor.needsUpdate = true;
  }, [shots]);

  if (!shots || !lines) return null;
  return (
    <group visible={visible}>
      <lineSegments geometry={lines}>
        <lineBasicMaterial vertexColors transparent opacity={0.75} />
      </lineSegments>
      <instancedMesh ref={dots} args={[undefined, undefined, shots.length]} frustumCulled={false}>
        <sphereGeometry args={[0.12, 12, 8]} />
        <meshBasicMaterial />
      </instancedMesh>
    </group>
  );
}
