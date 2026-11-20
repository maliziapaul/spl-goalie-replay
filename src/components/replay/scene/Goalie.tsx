"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { J, JOINTS, sample, toV } from "@/lib/goalie/data";
import { PALETTE } from "@/lib/goalie/palette";
import { useReplay } from "@/lib/goalie/store";

type Part = "body" | "pad";
// Bones between tracked keypoints, with a radius in feet. Leg segments wear pads.
const BONES: [string, string, number, Part][] = [
  ["LEFT_SHOULDER", "LEFT_ELBOW", 0.15, "body"], ["LEFT_ELBOW", "LEFT_WRIST", 0.14, "body"],
  ["RIGHT_SHOULDER", "RIGHT_ELBOW", 0.15, "body"], ["RIGHT_ELBOW", "RIGHT_WRIST", 0.14, "body"],
  ["LEFT_SHOULDER", "RIGHT_SHOULDER", 0.2, "body"], ["LEFT_HIP", "RIGHT_HIP", 0.25, "body"],
  ["LEFT_SHOULDER", "LEFT_HIP", 0.3, "body"], ["RIGHT_SHOULDER", "RIGHT_HIP", 0.3, "body"],
  ["NECK", "MID_HIP", 0.38, "body"], ["NECK", "NOSE", 0.12, "body"],
  ["LEFT_HIP", "LEFT_KNEE", 0.27, "pad"], ["RIGHT_HIP", "RIGHT_KNEE", 0.27, "pad"],
  ["LEFT_KNEE", "LEFT_ANKLE", 0.34, "pad"], ["RIGHT_KNEE", "RIGHT_ANKLE", 0.34, "pad"],
];
// Rounded joints; wrists are larger to read as glove and blocker.
const JOINT_R: [string, number, Part][] = [
  ["LEFT_SHOULDER", 0.18, "body"], ["RIGHT_SHOULDER", 0.18, "body"], ["LEFT_ELBOW", 0.15, "body"], ["RIGHT_ELBOW", 0.15, "body"],
  ["LEFT_WRIST", 0.34, "body"], ["RIGHT_WRIST", 0.3, "body"], ["LEFT_HIP", 0.27, "body"], ["RIGHT_HIP", 0.27, "body"],
  ["MID_HIP", 0.36, "body"], ["NECK", 0.2, "body"], ["LEFT_KNEE", 0.34, "pad"], ["RIGHT_KNEE", 0.34, "pad"],
  ["LEFT_ANKLE", 0.3, "pad"], ["RIGHT_ANKLE", 0.3, "pad"],
];

const UP = new THREE.Vector3(0, 1, 0);

export function Goalie() {
  const bones = useRef<(THREE.Mesh | null)[]>([]);
  const joints = useRef<(THREE.Mesh | null)[]>([]);
  const head = useRef<THREE.Mesh>(null);
  const cage = useRef<THREE.Mesh>(null);
  const jp = useMemo(() => JOINTS.map(() => new THREE.Vector3()), []);
  const dir = useMemo(() => new THREE.Vector3(), []);

  const { cyl, sph, cageGeo, body, pad, helmet, cageMat } = useMemo(() => {
    const goalie = new THREE.Color(PALETTE.goalie);
    return {
      cyl: new THREE.CylinderGeometry(1, 1, 1, 14, 1, true),
      sph: new THREE.SphereGeometry(1, 20, 14),
      cageGeo: new THREE.SphereGeometry(0.47, 16, 10, -Math.PI / 2.4, Math.PI / 1.2, Math.PI / 3, Math.PI / 2.6),
      body: new THREE.MeshStandardMaterial({ color: goalie, roughness: 0.45, metalness: 0.05, emissive: goalie.clone().multiplyScalar(0.12) }),
      pad: new THREE.MeshStandardMaterial({ color: PALETTE.pad, roughness: 0.55 }),
      helmet: new THREE.MeshStandardMaterial({ color: "#f6f4fa", roughness: 0.3, metalness: 0.1 }),
      cageMat: new THREE.MeshStandardMaterial({ color: "#2a2f38", wireframe: true }),
    };
  }, []);

  useFrame(() => {
    const { shots, shot, f } = useReplay.getState();
    const s = shots?.[shot];
    if (!s) return;
    for (let j = 0; j < JOINTS.length; j++) toV(sample(s, f, j * 3), sample(s, f, j * 3 + 1), sample(s, f, j * 3 + 2), jp[j]);
    BONES.forEach(([a, b, r], i) => {
      const m = bones.current[i];
      if (!m) return;
      const A = jp[J[a]], B = jp[J[b]];
      dir.subVectors(B, A);
      const len = dir.length() || 1;
      m.position.addVectors(A, B).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(UP, dir.divideScalar(len));
      m.scale.set(r, len, r);
    });
    JOINT_R.forEach(([n], i) => joints.current[i]?.position.copy(jp[J[n]]));
    if (head.current && cage.current) {
      head.current.position.copy(jp[J.LEFT_EAR]).add(jp[J.RIGHT_EAR]).multiplyScalar(0.5).lerp(jp[J.NOSE], 0.3);
      cage.current.position.copy(head.current.position);
      dir.subVectors(jp[J.NOSE], head.current.position);
      cage.current.rotation.set(0, Math.atan2(dir.x, dir.z) - Math.PI / 2, 0);
    }
  });

  return (
    <group>
      {BONES.map(([, , , part], i) => (
        <mesh key={`b${i}`} ref={(el) => { bones.current[i] = el; }} geometry={cyl} material={part === "pad" ? pad : body} castShadow />
      ))}
      {JOINT_R.map(([, r, part], i) => (
        <mesh key={`j${i}`} ref={(el) => { joints.current[i] = el; }} geometry={sph} material={part === "pad" ? pad : body} scale={r} castShadow />
      ))}
      <mesh ref={head} geometry={sph} material={helmet} scale={0.43} castShadow />
      <mesh ref={cage} geometry={cageGeo} material={cageMat} />
    </group>
  );
}
