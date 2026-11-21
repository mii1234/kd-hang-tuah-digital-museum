import { useEffect, useMemo } from 'react';
import { useLoader, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ConfigId, Display, SpaceId, ViewMode } from './exteriorData';

export interface ModelAnchor { id: string; center: THREE.Vector3; top: THREE.Vector3; size: number }

interface Props {
  url: string;
  config: ConfigId;
  mode: ViewMode;
  /** Technical view only: exterior, wireframe, structural or internal. */
  display: Display;
  /** Phase 3: the space being inspected from the inside (null: the full ship). */
  inspect: SpaceId | null;
  selectedId: string | null;
  /** mesh name → component ID */
  meshToComponent: Map<string, string>;
  /** component ID → meshes to use for its anchor (when only some of its meshes should place the marker) */
  anchorMeshes: Map<string, string[]>;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onReady: (anchors: Map<string, ModelAnchor>) => void;
}

const HIGHLIGHT = new THREE.Color('#b69a62');
const TECH_FILL = new THREE.Color('#eef2f4');
const TECH_EDGE = new THREE.Color('#1c3550');
const BLACK = new THREE.Color(0x000000);

function visibleChain(o: THREE.Object3D | null): boolean {
  for (let p = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

interface Prepared {
  mesh: THREE.Mesh;
  real: THREE.MeshStandardMaterial;
  tech: THREE.MeshStandardMaterial;
  edges: THREE.LineSegments | null;
  /** exterior | structural | internal | interior (from the model's node extras) */
  layer: string;
  /** interior parts: the space they belong to */
  space: string | null;
  /** faint see-through material used for everything outside the inspected space */
  faint: THREE.MeshStandardMaterial;
}

/**
 * The exterior model (one GLB shared by every view). Realistic view uses the model's own materials;
 * Technical view swaps them for a flat light material with drawn edges. In the Structural and
 * Internal displays the exterior becomes a faint ghost so the conceptual internal parts can be seen.
 * Configuration parts are switched by node visibility, so the hull is the same in both configurations.
 */
export function ShipModel({ url, config, mode, display, inspect, selectedId, meshToComponent, anchorMeshes, onSelect, onHover, onReady }: Props) {
  const gltf = useLoader(GLTFLoader, url);
  const invalidate = useThree((st) => st.invalidate);

  const prepared = useMemo(() => {
    const scene = gltf.scene;
    const meshes: Prepared[] = [];
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const real = (mesh.material as THREE.MeshStandardMaterial).clone();
      const layer = (mesh.userData.layer as string) ?? (mesh.userData.group === 'internal' ? 'internal' : 'exterior');
      const internal = mesh.userData.group === 'internal';
      const interior = mesh.userData.group === 'interior';
      if (internal) { real.depthWrite = false; real.side = THREE.DoubleSide; }
      const faint = new THREE.MeshStandardMaterial({ color: (real.color as THREE.Color).clone().lerp(new THREE.Color('#dfe6ea'), 0.55), roughness: 0.9, metalness: 0, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
      const tech = new THREE.MeshStandardMaterial({ color: TECH_FILL, roughness: 0.9, metalness: 0, flatShading: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
      let edges: THREE.LineSegments | null = null;
      if (!mesh.userData.noEdges && !internal && !interior) {
        edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 28), new THREE.LineBasicMaterial({ color: TECH_EDGE, transparent: true }));
        edges.raycast = () => {};
        edges.name = `${mesh.name}__edges`;
        mesh.add(edges);
      }
      // Interiors are lit without shadow maps (no shadow acne on small parts, and the shell does not darken them).
      mesh.castShadow = !internal && !interior;
      mesh.receiveShadow = !internal && !interior;
      meshes.push({ mesh, real, tech, edges, layer, space: (mesh.userData.space as string) ?? null, faint });
    });
    return { scene, meshes };
  }, [gltf]);

  const ghost = !inspect && mode === 'technical' && (display === 'structural' || display === 'internal');

  // Configuration and internal groups.
  useEffect(() => {
    prepared.scene.traverse((o) => {
      if (o.name === 'config_as_built') o.visible = config === 'as_built';
      if (o.name === 'config_later') o.visible = config === 'later';
      if (o.name === 'internal_conceptual') o.visible = ghost;
      if (o.name === 'interior_spaces') o.visible = !!inspect;
    });
    for (const { mesh, layer, space } of prepared.meshes) {
      if (mesh.userData.group === 'internal') mesh.visible = layer === 'structural' || display === 'internal';
      if (mesh.userData.group === 'interior') mesh.visible = space === inspect;
      // While inspecting, the faded exterior must not shade the space inside it.
      if (mesh.userData.group !== 'internal' && mesh.userData.group !== 'interior') mesh.castShadow = !inspect;
    }
    invalidate();
  }, [prepared, config, ghost, display, inspect, invalidate]);

  // Materials for the view, display and selection highlight.
  useEffect(() => {
    for (const { mesh, real, tech, edges, faint } of prepared.meshes) {
      const selected = selectedId !== null && meshToComponent.get(mesh.name) === selectedId;
      const internal = mesh.userData.group === 'internal';
      const interior = mesh.userData.group === 'interior';
      if (inspect && !interior) {
        // Inspecting a space: everything else is a faint outline of the ship around it.
        faint.opacity = mode === 'technical' ? 0.07 : 0.1;
        mesh.material = faint;
        if (edges) { edges.visible = mode === 'technical'; (edges.material as THREE.LineBasicMaterial).opacity = 0.12; }
        continue;
      }
      if (interior) {
        real.emissive.copy(selected ? HIGHLIGHT : BLACK);
        real.emissiveIntensity = selected ? 0.55 : 0;
        mesh.material = real;
        continue;
      }
      if (mode === 'realistic') {
        real.emissive.copy(selected ? HIGHLIGHT : BLACK);
        real.emissiveIntensity = selected ? 0.55 : 0;
        mesh.material = real;
        if (edges) edges.visible = false;
        continue;
      }
      if (internal) {
        // Conceptual parts keep their own translucent colours; the selected one turns brass.
        real.emissive.copy(selected ? HIGHLIGHT : BLACK);
        real.emissiveIntensity = selected ? 0.8 : 0;
        mesh.material = real;
        continue;
      }
      const wire = display === 'wireframe';
      tech.wireframe = wire;
      tech.color.copy(selected ? HIGHLIGHT : TECH_FILL);
      if (tech.transparent !== (wire || ghost)) { tech.transparent = wire || ghost; tech.needsUpdate = true; } // the shader changes with transparency
      tech.opacity = ghost ? (selected ? 0.5 : 0.08) : wire ? 0.35 : 1;
      tech.depthWrite = !ghost;
      mesh.material = tech;
      if (edges) {
        edges.visible = !wire;
        const lm = edges.material as THREE.LineBasicMaterial;
        lm.color.copy(selected ? new THREE.Color('#7d6533') : TECH_EDGE);
        lm.opacity = ghost ? 0.22 : 1;
      }
    }
    invalidate();
  }, [prepared, mode, display, ghost, inspect, selectedId, meshToComponent, invalidate]);

  // Anchor points (centre and top of each visible component) for the camera and the screen labels.
  useEffect(() => {
    prepared.scene.updateMatrixWorld(true);
    const boxes = new Map<string, THREE.Box3>();
    for (const { mesh } of prepared.meshes) {
      const id = meshToComponent.get(mesh.name);
      if (!id || !visibleChain(mesh)) continue;
      const only = anchorMeshes.get(id);
      if (only && !only.includes(mesh.name)) continue;
      const b = new THREE.Box3().setFromObject(mesh, true);
      const prev = boxes.get(id);
      boxes.set(id, prev ? prev.union(b) : b);
    }
    const anchors = new Map<string, ModelAnchor>();
    for (const [id, b] of boxes) {
      const center = b.getCenter(new THREE.Vector3());
      const size = b.getSize(new THREE.Vector3());
      anchors.set(id, { id, center, top: new THREE.Vector3(center.x, b.max.y, center.z), size: Math.max(size.x, size.y, size.z) });
    }
    onReady(anchors);
  }, [prepared, config, ghost, display, inspect, meshToComponent, anchorMeshes, onReady]);

  // Picking: in the Structural and Internal displays, a conceptual internal part under the pointer wins
  // over the ghosted exterior in front of it.
  const pick = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    let first: string | null = null;
    for (const hit of e.intersections) {
      if (!visibleChain(hit.object)) continue;
      const id = meshToComponent.get(hit.object.name);
      if (!id) continue;
      // Inspecting: only the parts of the inspected space can be picked.
      if (inspect) { if (hit.object.userData.group === 'interior') return id; continue; }
      if (!ghost) return id;
      if (hit.object.userData.group === 'internal') return id;
      first ??= id;
    }
    return first;
  };

  return (
    <primitive
      object={prepared.scene}
      onClick={(e: ThreeEvent<MouseEvent>) => { const id = pick(e); if (id) { e.stopPropagation(); onSelect(id); } }}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onHover(pick(e)); }}
      onPointerOut={() => onHover(null)}
    />
  );
}
