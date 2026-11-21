import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import type { ScreenAnchor } from './exteriorData';
export type { ScreenAnchor };

interface Props {
  anchors: ScreenAnchor[];
  /** DOM elements (outside the canvas) positioned over the anchors; keyed like the anchors. */
  elements: React.RefObject<Map<string, HTMLElement>>;
}

/**
 * Positions HTML markers and labels over 3D points without extra libraries: every frame each
 * anchor is projected to the screen and its element moved with a CSS transform. Points behind the
 * camera or outside the view are hidden.
 */
export function ShipHotspots({ anchors, elements }: Props) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => { invalidate(); }, [anchors, invalidate]);
  const v = useRef(new THREE.Vector3());
  const dir = useRef(new THREE.Vector3());
  useFrame(() => {
    const map = elements.current;
    if (!map) return;
    camera.getWorldDirection(dir.current);
    for (const a of anchors) {
      const el = map.get(a.key);
      if (!el) continue;
      if (a.axis && Math.abs(dir.current.x * a.axis[0] + dir.current.y * a.axis[1] + dir.current.z * a.axis[2]) > 0.9) { el.style.visibility = 'hidden'; continue; }
      v.current.set(a.position[0], a.position[1], a.position[2]).project(camera);
      const visible = v.current.z < 1 && Math.abs(v.current.x) <= 1.05 && Math.abs(v.current.y) <= 1.05;
      if (!visible) { el.style.visibility = 'hidden'; continue; }
      const x = (v.current.x * 0.5 + 0.5) * size.width;
      const y = (-v.current.y * 0.5 + 0.5) * size.height;
      el.style.visibility = 'visible';
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    }
  });
  return null;
}
