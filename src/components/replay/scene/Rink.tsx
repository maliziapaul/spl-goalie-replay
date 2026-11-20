"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { toV } from "@/lib/goalie/data";
import { PALETTE } from "@/lib/goalie/palette";
import { useReplay } from "@/lib/goalie/store";

// Visible ice: from x = 40 ft to the end boards at x = 100 ft, full width (NHL rink, feet, origin at centre ice).
const X0 = 40, X1 = 100, Y0 = -42.5, Y1 = 42.5;

function paintIce(): HTMLCanvasElement {
  const PX = 24;
  const c = document.createElement("canvas");
  c.width = (X1 - X0) * PX;
  c.height = (Y1 - Y0) * PX;
  const g = c.getContext("2d")!;
  const cx = (x: number) => (x - X0) * PX;
  const cy = (y: number) => (Y1 - y) * PX;
  const boards = () => {
    g.beginPath();
    g.moveTo(cx(X0), cy(42.5));
    g.lineTo(cx(72), cy(42.5));
    g.arc(cx(72), cy(14.5), 28 * PX, -Math.PI / 2, 0);
    g.lineTo(cx(100), cy(-14.5));
    g.arc(cx(72), cy(-14.5), 28 * PX, 0, Math.PI / 2);
    g.lineTo(cx(X0), cy(-42.5));
    g.closePath();
  };
  g.fillStyle = PALETTE.arena;
  g.fillRect(0, 0, c.width, c.height);
  boards();
  g.save();
  g.clip();
  const grad = g.createRadialGradient(cx(84), cy(0), 2 * PX, cx(80), cy(0), 46 * PX);
  grad.addColorStop(0, "#f7fafd");
  grad.addColorStop(1, "#dfe8f1");
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  // skate scratches around the crease
  g.strokeStyle = "rgba(150,170,195,0.10)";
  g.lineWidth = 1.2;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 160; i++) {
    const x = 74 + rnd() * 15, y = (rnd() - 0.5) * 22, l = 1 + rnd() * 5, a = rnd() * Math.PI;
    g.beginPath();
    g.moveTo(cx(x), cy(y));
    g.quadraticCurveTo(cx(x + l * 0.5 * Math.cos(a) + 0.4), cy(y + l * 0.5 * Math.sin(a)), cx(x + l * Math.cos(a)), cy(y + l * Math.sin(a)));
    g.stroke();
  }
  const red = "#cf2a2a";
  g.fillStyle = red;
  g.fillRect(cx(89) - PX / 12, cy(37), PX / 6, 74 * PX); // goal line
  // crease: 8 ft wide, closed by a 6 ft arc around the centre of the goal line
  g.beginPath();
  g.moveTo(cx(89), cy(-4));
  g.lineTo(cx(89 - Math.sqrt(20)), cy(-4));
  g.arc(cx(89), cy(0), 6 * PX, Math.PI - Math.asin(4 / 6), Math.PI + Math.asin(4 / 6));
  g.lineTo(cx(89), cy(4));
  g.closePath();
  g.fillStyle = "rgba(80,150,235,0.55)";
  g.fill();
  g.strokeStyle = red;
  g.lineWidth = PX / 6;
  g.stroke();
  // goalie trapezoid
  g.beginPath();
  g.moveTo(cx(89), cy(11)); g.lineTo(cx(100), cy(14));
  g.moveTo(cx(89), cy(-11)); g.lineTo(cx(100), cy(-14));
  g.stroke();
  // end-zone faceoff circles, dots and hash marks
  for (const sy of [-22, 22]) {
    g.beginPath(); g.arc(cx(69), cy(sy), 15 * PX, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(cx(69), cy(sy), PX, 0, Math.PI * 2); g.fill();
    for (const dx of [-2, 2]) for (const dy of [-0.75, 0.75]) {
      g.beginPath();
      g.moveTo(cx(69 + dx), cy(sy + dy)); g.lineTo(cx(69 + dx * 2), cy(sy + dy));
      g.moveTo(cx(69 + dx), cy(sy + dy)); g.lineTo(cx(69 + dx), cy(sy + dy * 4));
      g.stroke();
    }
    for (const dx of [-2.9, 2.9]) {
      g.beginPath();
      g.moveTo(cx(69 + dx), cy(sy + 14.7)); g.lineTo(cx(69 + dx), cy(sy + 16.7));
      g.moveTo(cx(69 + dx), cy(sy - 14.7)); g.lineTo(cx(69 + dx), cy(sy - 16.7));
      g.stroke();
    }
  }
  g.restore();
  boards();
  g.strokeStyle = "#f0c63a";
  g.lineWidth = PX * 0.5;
  g.stroke();
  return c;
}

function boardOutline(): [number, number][] {
  const pts: [number, number][] = [[X0, 42.5], [72, 42.5]];
  for (let k = 1; k <= 24; k++) {
    const a = Math.PI / 2 - (k / 24) * (Math.PI / 2);
    pts.push([72 + 28 * Math.cos(a), 14.5 + 28 * Math.sin(a)]);
  }
  pts.push([100, -14.5]);
  for (let k = 1; k <= 24; k++) {
    const a = -(k / 24) * (Math.PI / 2);
    pts.push([72 + 28 * Math.cos(a), -14.5 + 28 * Math.sin(a)]);
  }
  pts.push([X0, -42.5]);
  return pts;
}

function ribbon(pts: [number, number][], z0: number, z1: number) {
  const pos: number[] = [], idx: number[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  pts.forEach(([x, y], i) => {
    toV(x, y, z0, a); toV(x, y, z1, b);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    if (i) { const q = i * 2; idx.push(q - 2, q - 1, q, q - 1, q + 1, q); }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

export function Ice() {
  const gl = useThree((s) => s.gl);
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(paintIce());
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = gl.capabilities.getMaxAnisotropy();
    return t;
  }, [gl]);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[(X0 + X1) / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[X1 - X0, Y1 - Y0]} />
      <meshStandardMaterial map={tex} roughness={0.28} metalness={0} />
    </mesh>
  );
}

export function Boards() {
  const { kick, board, glass, cap } = useMemo(() => {
    const pts = boardOutline();
    const capPos: number[] = [];
    const v = new THREE.Vector3();
    pts.forEach(([x, y]) => { toV(x, y, 3.5, v); capPos.push(v.x, v.y, v.z); });
    const cap = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(capPos, 3));
    return { kick: ribbon(pts, 0, 0.75), board: ribbon(pts, 0.75, 3.5), glass: ribbon(pts, 3.5, 9), cap };
  }, []);
  return (
    <group>
      <mesh geometry={kick}><meshStandardMaterial color="#e8c547" roughness={0.6} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={board}><meshStandardMaterial color="#f2f4f7" roughness={0.5} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={glass}>
        <meshStandardMaterial color="#9fc2e8" transparent opacity={0.08} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <line>
        <primitive object={cap} attach="geometry" />
        <lineBasicMaterial color="#c7ccd4" />
      </line>
    </group>
  );
}

const tube = (pts: number[][], r: number) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => toV(q[0], q[1], q[2])), false, "catmullrom", 0), 64, r, 10, false);

export function Net() {
  const { frame, base, mesh } = useMemo(() => {
    const frame = tube([[89, -3, 0], [89, -3, 2], [89, -3, 3.95], [89, -2.9, 4], [89, 0, 4], [89, 2.9, 4], [89, 3, 3.95], [89, 3, 2], [89, 3, 0]], 0.1);
    const basePts = [[89, -3, 0.05], [90.5, -3.55, 0.05], [91.9, -2.6, 0.05], [92.33, 0, 0.05], [91.9, 2.6, 0.05], [90.5, 3.55, 0.05], [89, 3, 0.05]];
    const base = tube(basePts, 0.06);
    // netting: a lattice stretched from the base frame up to the crossbar
    const curve = new THREE.CatmullRomCurve3(basePts.map((q) => new THREE.Vector3(q[0], q[1], q[2])));
    const at = (u: number, v: number) => {
      const b = curve.getPoint(u);
      const tx = u < 0.08 || u > 0.92 ? 89.1 : 89.6, ty = -3 + 6 * u;
      return toV(b.x + (tx - b.x) * v, b.y + (ty - b.y) * v, b.z + (4 - b.z) * Math.pow(v, 0.8));
    };
    const NU = 34, NV = 10, pos: number[] = [];
    for (let i = 0; i <= NU; i++) for (let j = 0; j < NV; j++) { const a = at(i / NU, j / NV), b = at(i / NU, (j + 1) / NV); pos.push(a.x, a.y, a.z, b.x, b.y, b.z); }
    for (let j = 1; j <= NV; j++) for (let i = 0; i < NU; i++) { const a = at(i / NU, j / NV), b = at((i + 1) / NU, j / NV); pos.push(a.x, a.y, a.z, b.x, b.y, b.z); }
    const mesh = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    return { frame, base, mesh };
  }, []);
  return (
    <group>
      <mesh geometry={frame} castShadow><meshStandardMaterial color="#d42a2a" roughness={0.35} metalness={0.2} /></mesh>
      <mesh geometry={base} castShadow><meshStandardMaterial color="#f2f2f2" roughness={0.5} /></mesh>
      <lineSegments geometry={mesh}><lineBasicMaterial color="#ffffff" transparent opacity={0.55} /></lineSegments>
    </group>
  );
}

/** Red goal lamp behind the glass; lights from the frame the puck enters the net. */
export function GoalLamp() {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const goal = useMemo(() => new THREE.Color(PALETTE.goal), []);
  const off = useMemo(() => new THREE.Color(0), []);
  useFrame(() => {
    const { shots, shot, f } = useReplay.getState();
    const s = shots?.[shot];
    const lit = !!s && s.goalFrame >= 0 && f >= s.goalFrame;
    mat.current?.emissive.copy(lit ? goal : off);
    if (light.current) light.current.intensity = lit ? 60 : 0;
  });
  const p = toV(101.5, 0, 9.6);
  return (
    <group>
      <mesh position={p}>
        <cylinderGeometry args={[0.5, 0.6, 1.1, 20]} />
        <meshStandardMaterial ref={mat} color="#441010" roughness={0.4} emissiveIntensity={2} />
      </mesh>
      <pointLight ref={light} position={[p.x - 1, p.y - 0.5, p.z]} color={PALETTE.goal} intensity={0} distance={40} decay={2} />
    </group>
  );
}
