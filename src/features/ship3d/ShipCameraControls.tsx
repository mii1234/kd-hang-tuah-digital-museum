import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CameraView } from './exteriorData';

export interface CameraApi {
  view: (v: CameraView) => void;
  reset: () => void;
  zoom: (factor: number) => void;
  rotate: (azimuthDeg: number, polarDeg?: number) => void;
  focus: (center: THREE.Vector3, size: number) => void;
  /** Phase 3: frame a space from a given direction at a given distance (interior inspection). */
  frame: (center: THREE.Vector3, dir: THREE.Vector3, distance: number) => void;
}

// Directions from the ship's centre to the camera. +x bow, +y up, +z starboard; the side view is from port.
const VIEW_DIRS: Record<CameraView, THREE.Vector3> = {
  three_quarter: new THREE.Vector3(0.72, 0.36, -0.86).normalize(),
  front: new THREE.Vector3(1, 0.1, 0).normalize(),
  rear: new THREE.Vector3(-1, 0.14, 0).normalize(),
  side: new THREE.Vector3(0, 0.06, -1).normalize(),
  top: new THREE.Vector3(0, 1, -0.02).normalize(),
};
const HOME_TARGET = new THREE.Vector3(0, 5, 0);

interface Props { reducedMotion: boolean; /** allow the camera close to the model (interior inspection) */ close?: boolean }

/** OrbitControls (bundled with three) plus smooth, interruptible camera moves. */
export const ShipCameraControls = forwardRef<CameraApi, Props>(function ShipCameraControls({ reducedMotion, close = false }, ref) {
  const { camera, gl, size, invalidate } = useThree();
  const controls = useMemo(() => new OrbitControls(camera, gl.domElement), [camera, gl]);
  const tween = useRef<{ fromPos: THREE.Vector3; toPos: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3; t: number; start: number } | null>(null);

  useEffect(() => {
    controls.enableDamping = !reducedMotion;
    controls.dampingFactor = 0.08;
    controls.minDistance = 8;
    controls.maxDistance = 320;
    controls.maxPolarAngle = Math.PI * 0.98;
    controls.screenSpacePanning = true;
    controls.addEventListener('start', () => { tween.current = null; });
    // Render on demand: any camera change from the pointer, wheel or touch requests a frame.
    controls.addEventListener('change', () => invalidate());
    return () => controls.dispose();
  }, [controls, reducedMotion]);
  useEffect(() => { controls.minDistance = close ? 2.5 : 8; }, [controls, close]);

  // Distance at which the whole ship fits the view, for the current aspect ratio. Views that show
  // the ship's length across the screen move back on narrow (portrait) screens.
  const BASE: Record<CameraView, number> = { three_quarter: 150, front: 80, rear: 80, side: 150, top: 160 };
  const NEED_WIDTH: Record<CameraView, number> = { three_quarter: 106, front: 30, rear: 30, side: 114, top: 116 }; // metres across the screen
  const fitDistance = (v: CameraView) => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * aspect; // tan of half the horizontal field of view
    return Math.max(BASE[v], NEED_WIDTH[v] / (2 * halfH));
  };

  const moveTo = (pos: THREE.Vector3, target: THREE.Vector3) => {
    if (reducedMotion) {
      camera.position.copy(pos); controls.target.copy(target); controls.update(); tween.current = null; invalidate(); return;
    }
    tween.current = { fromPos: camera.position.clone(), toPos: pos, fromTarget: controls.target.clone(), toTarget: target, t: 0, start: performance.now() };
    invalidate();
  };

  const api: CameraApi = {
    view: (v) => { const dir = VIEW_DIRS[v]; moveTo(HOME_TARGET.clone().addScaledVector(dir, fitDistance(v)), HOME_TARGET.clone()); },
    reset: () => api.view('three_quarter'),
    zoom: (factor) => {
      const target = tween.current?.toTarget ?? controls.target;
      const offset = camera.position.clone().sub(target).multiplyScalar(factor);
      const len = THREE.MathUtils.clamp(offset.length(), controls.minDistance, controls.maxDistance);
      moveTo(target.clone().add(offset.setLength(len)), target.clone());
    },
    rotate: (az, polar = 0) => {
      const offset = camera.position.clone().sub(controls.target);
      const s = new THREE.Spherical().setFromVector3(offset);
      s.theta += THREE.MathUtils.degToRad(az);
      s.phi = THREE.MathUtils.clamp(s.phi + THREE.MathUtils.degToRad(polar), 0.05, Math.PI * 0.98);
      moveTo(controls.target.clone().add(new THREE.Vector3().setFromSpherical(s)), controls.target.clone());
    },
    focus: (center, sz) => {
      const dir = camera.position.clone().sub(controls.target).normalize();
      if (dir.y < 0.15) dir.y = 0.25; // keep a slightly raised viewpoint
      dir.normalize();
      const dist = THREE.MathUtils.clamp(sz * 3.4, 30, 110) * Math.max(1, (size.height / Math.max(1, size.width)) * 1.4);
      moveTo(center.clone().addScaledVector(dir, dist), center.clone());
    },
    frame: (center, dir, distance) => {
      const d = distance * Math.max(1, (size.height / Math.max(1, size.width)) * 1.5);
      moveTo(center.clone().addScaledVector(dir.clone().normalize(), d), center.clone());
    },
  };
  useImperativeHandle(ref, () => api);

  // Initial three-quarter view.
  useEffect(() => {
    const dir = VIEW_DIRS.three_quarter;
    camera.position.copy(HOME_TARGET.clone().addScaledVector(dir, fitDistance('three_quarter')));
    controls.target.copy(HOME_TARGET);
    controls.update();
  }, [controls]);

  useFrame(() => {
    const tw = tween.current;
    if (tw) {
      // Wall-clock timing: the move takes 0.9 s however many frames the device can draw.
      tw.t = Math.min(1, (performance.now() - tw.start) / 900);
      const k = tw.t < 0.5 ? 4 * tw.t ** 3 : 1 - (-2 * tw.t + 2) ** 3 / 2; // ease in-out
      camera.position.lerpVectors(tw.fromPos, tw.toPos, k);
      controls.target.lerpVectors(tw.fromTarget, tw.toTarget, k);
      if (tw.t >= 1) tween.current = null;
    }
    // Keep rendering while a move or the damping is still settling; otherwise the scene stays idle.
    const moving = controls.update();
    if (tween.current || moving) invalidate();
  });

  return null;
});
