import { Suspense, forwardRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { ShipModel, type ModelAnchor } from './ShipModel';
import { ShipCameraControls, type CameraApi } from './ShipCameraControls';
import { ShipDimensions } from './ShipDimensions';
import { ShipHotspots, type ScreenAnchor } from './ShipHotspots';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { ConfigId, Display, ExteriorDimension, SpaceId, ViewMode } from './exteriorData';

export interface ShipCanvasProps {
  modelUrl: string;
  config: ConfigId;
  mode: ViewMode;
  display: Display;
  inspect: SpaceId | null;
  selectedId: string | null;
  meshToComponent: Map<string, string>;
  anchorMeshes: Map<string, string[]>;
  dimensions: ExteriorDimension[];
  labelAnchors: ScreenAnchor[];
  labelElements: React.RefObject<Map<string, HTMLElement>>;
  reducedMotion: boolean;
  active: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onReady: (anchors: Map<string, ModelAnchor>) => void;
}

/** Water surface: opaque sea in Realistic view; a faint plane and grid in Technical view. */
function Surroundings({ mode, inspect }: { mode: ViewMode; inspect: SpaceId | null }) {
  const grid = useMemo(() => {
    const g = new THREE.GridHelper(240, 48, '#9fb3c1', '#cdd8df');
    g.position.y = 0.01;
    (g.material as THREE.Material).transparent = true;
    (g.material as THREE.Material).opacity = 0.7;
    g.raycast = () => {};
    return g;
  }, []);
  if (mode === 'technical') {
    return (
      <>
        <primitive object={grid} />
        <mesh rotation-x={-Math.PI / 2} raycast={() => null}>
          <planeGeometry args={[240, 240]} />
          <meshBasicMaterial color="#9fc1d6" transparent opacity={inspect ? 0.08 : 0.18} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </>
    );
  }
  return (
    <>
      <fog attach="fog" args={['#cdd8de', 220, 900]} />
      {/* While a space is inspected the sea is see-through, so spaces below the waterline stay visible. */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow raycast={() => null}>
        <circleGeometry args={[1400, 64]} />
        <meshStandardMaterial key={inspect ? 'see-through' : 'solid'} color="#35566b" roughness={0.78} metalness={0} transparent={!!inspect} opacity={inspect ? 0.22 : 1} depthWrite={!inspect} />
      </mesh>
    </>
  );
}

function Lights({ mode }: { mode: ViewMode }) {
  return (
    <>
      <hemisphereLight args={['#eef0ee', '#2c4152', mode === 'technical' ? 1.9 : 0.8]} />
      <directionalLight
        position={[60, 90, -50]}
        intensity={mode === 'technical' ? 1.0 : 2.0}
        castShadow={mode === 'realistic'}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={10}
        shadow-camera-far={260}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-70, 30, 60]} intensity={mode === 'technical' ? 0.5 : 0.45} />
    </>
  );
}

/** The 3D part of the explorer. Loaded on demand, so the rest of the page never waits for three.js. */
const ShipCanvas = forwardRef<CameraApi, ShipCanvasProps>(function ShipCanvas(props, cameraRef) {
  const { modelUrl, config, mode, display, inspect, selectedId, meshToComponent, anchorMeshes, dimensions, labelAnchors, labelElements, reducedMotion, active, onSelect, onHover, onReady } = props;
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.75]}
      frameloop={active ? 'demand' : 'never'}
      camera={{ fov: 30, near: 0.5, far: 2500, position: [90, 50, -100] }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.0;
        // Soft, neutral reflections for the painted steel (generated, no image file).
        const pmrem = new THREE.PMREMGenerator(gl);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        scene.environmentIntensity = 0.22;
        pmrem.dispose();
      }}
    >
      <Lights mode={mode} />
      <Surroundings mode={mode} inspect={inspect} />
      <Suspense fallback={null}>
        <ShipModel url={modelUrl} config={config} mode={mode} display={display} inspect={inspect} selectedId={selectedId} meshToComponent={meshToComponent} anchorMeshes={anchorMeshes} onSelect={onSelect} onHover={onHover} onReady={onReady} />
      </Suspense>
      {mode === 'technical' && display === 'exterior' && !inspect && <ShipDimensions dims={dimensions} />}
      <ShipHotspots anchors={labelAnchors} elements={labelElements} />
      <ShipCameraControls ref={cameraRef} reducedMotion={reducedMotion} close={!!inspect} />
    </Canvas>
  );
});

export default ShipCanvas;
