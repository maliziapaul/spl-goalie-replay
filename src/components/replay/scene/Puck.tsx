"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CH, PUCK, SPD, sample, toV } from "@/lib/goalie/data";
import { PALETTE, speedColor } from "@/lib/goalie/palette";
import { useReplay } from "@/lib/goalie/store";

const TRAIL = 28;

/** The puck (3 in x 1 in) and a comet of its last tracked positions, coloured by speed. */
export function Puck() {
  const puck = useRef<THREE.Mesh>(null);
  const trail = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), v: new THREE.Vector3(), c: new THREE.Color(), bg: new THREE.Color(PALETTE.arena) }), []);

  // create the instance colour buffer before the first render so the shader includes it
  useLayoutEffect(() => {
    const t = trail.current;
    if (!t) return;
    for (let k = 0; k < TRAIL; k++) { t.setColorAt(k, tmp.c.set(PALETTE.mid)); t.setMatrixAt(k, tmp.m.makeScale(0, 0, 0)); }
  }, [tmp]);

  useFrame(() => {
    const { shots, shot, f } = useReplay.getState();
    const s = shots?.[shot];
    const p = puck.current, t = trail.current;
    if (!s || !p || !t) return;
    const x = sample(s, f, PUCK);
    p.visible = !Number.isNaN(x);
    if (p.visible) toV(x, sample(s, f, PUCK + 1), sample(s, f, PUCK + 2) + 0.042, p.position);
    const fi = Math.floor(f);
    for (let k = 0; k < TRAIL; k++) {
      const i = fi - k - 1, o = i * CH + PUCK;
      if (i < 0 || Number.isNaN(s.a[o])) { t.setMatrixAt(k, tmp.m.makeScale(0, 0, 0)); continue; }
      const r = 0.11 * (1 - k / TRAIL);
      t.setMatrixAt(k, tmp.m.makeScale(r, r, r).setPosition(toV(s.a[o], s.a[o + 1], s.a[o + 2] + 0.05, tmp.v)));
      const sp = s.a[i * CH + SPD];
      t.setColorAt(k, speedColor(Number.isNaN(sp) ? 0 : sp, tmp.c).lerp(tmp.bg, (k / TRAIL) * 0.7));
    }
    t.instanceMatrix.needsUpdate = true;
    if (t.instanceColor) t.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <mesh ref={puck} castShadow>
        <cylinderGeometry args={[0.125, 0.125, 0.083, 24]} />
        <meshStandardMaterial color="#111111" roughness={0.6} />
      </mesh>
      <instancedMesh ref={trail} args={[undefined, undefined, TRAIL]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial transparent opacity={0.85} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}
