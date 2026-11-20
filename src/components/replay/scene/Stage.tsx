"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import { toV } from "@/lib/goalie/data";
import { PALETTE } from "@/lib/goalie/palette";
import { useReplay } from "@/lib/goalie/store";
import { CAMS } from "@/lib/goalie/cams";
import { Boards, GoalLamp, Ice, Net } from "./Rink";
import { Goalie } from "./Goalie";
import { Puck } from "./Puck";
import { AllShots, ShotLayers } from "./Overlays";

function Playback() {
  const tick = useReplay((s) => s.tick);
  useFrame((_, dt) => tick(Math.min(0.1, dt)));
  return null;
}

function CameraRig() {
  const ref = useRef<CameraControls>(null);
  const cam = useReplay((s) => s.cam);
  const reduce = useReducedMotion();
  const first = useRef(true);
  useEffect(() => {
    const c = ref.current;
    if (!c || cam === "free") return;
    const { pos, tgt } = CAMS[cam];
    const p = toV(...pos), t = toV(...tgt);
    c.setLookAt(p.x, p.y, p.z, t.x, t.y, t.z, !first.current && !reduce);
    first.current = false;
  }, [cam, reduce]);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const onStart = () => useReplay.getState().setCam("free");
    c.addEventListener("controlstart", onStart);
    return () => c.removeEventListener("controlstart", onStart);
  }, []);
  return <CameraControls ref={ref} makeDefault minDistance={4} maxDistance={90} maxPolarAngle={Math.PI / 2 - 0.02} smoothTime={0.35} />;
}

export default function Stage() {
  const keyPos = toV(70, -14, 40);
  const fillPos = toV(95, 20, 20);
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ fov: 36, near: 0.1, far: 400, position: toV(64, -4, 11).toArray() }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      className="!absolute inset-0 touch-none"
    >
      <color attach="background" args={[PALETTE.arena]} />
      <fog attach="fog" args={[PALETTE.arena, 70, 150]} />
      <hemisphereLight args={["#e4ecff", "#1a2230", 1.6]} />
      <directionalLight
        position={keyPos}
        intensity={2.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={10}
        shadow-camera-far={80}
      >
        <object3D attach="target" position={toV(86, 0, 0)} />
      </directionalLight>
      <directionalLight position={fillPos} intensity={0.7} color="#bcd0ff" />
      <Ice />
      <Boards />
      <Net />
      <GoalLamp />
      <Goalie />
      <Puck />
      <ShotLayers />
      <AllShots />
      <CameraRig />
      <Playback />
    </Canvas>
  );
}
