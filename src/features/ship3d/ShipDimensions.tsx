import { useMemo } from 'react';
import * as THREE from 'three';
import type { ExteriorDimension } from './exteriorData';

// Measurement lines for Technical view, in model metres (+x bow, +y up, +z starboard, y = 0 waterline).
// The geometry matches the model, which is built to the recorded length overall, beam and draught.
import { DIM_GEOMETRY } from './exteriorData';
const { HALF, HALF_BEAM, DRAUGHT, BELOW, PORT_OFF, DRAUGHT_X } = DIM_GEOMETRY;

function segments(dims: ExteriorDimension[]): number[] {
  const p: number[] = [];
  const seg = (a: [number, number, number], b: [number, number, number]) => p.push(...a, ...b);
  const tick = (x: number, y: number, z: number, axis: 'x' | 'y' | 'z') => {
    const t = 0.9;
    if (axis === 'y') seg([x, y - t, z], [x, y + t, z]);
    if (axis === 'x') seg([x - t, y, z], [x + t, y, z]);
    if (axis === 'z') seg([x, y, z - t], [x, y, z + t]);
  };
  for (const d of dims) {
    if (d.Line === 'length_overall') {
      seg([-HALF, BELOW, PORT_OFF], [HALF, BELOW, PORT_OFF]);
      tick(-HALF, BELOW, PORT_OFF, 'y'); tick(HALF, BELOW, PORT_OFF, 'y');
      // extension lines from the extreme ends of the hull (stern deck edge, stem head)
      seg([-HALF, 4.12, 0], [-HALF, BELOW - 0.6, PORT_OFF]);
      seg([HALF, 5.6, 0], [HALF, BELOW - 0.6, PORT_OFF]);
    }
    if (d.Line === 'beam_max') {
      seg([-2, BELOW, -HALF_BEAM], [-2, BELOW, HALF_BEAM]);
      tick(-2, BELOW, -HALF_BEAM, 'y'); tick(-2, BELOW, HALF_BEAM, 'y');
      seg([-2, 4.2, -HALF_BEAM], [-2, BELOW - 0.6, -HALF_BEAM]);
      seg([-2, 4.2, HALF_BEAM], [-2, BELOW - 0.6, HALF_BEAM]);
      seg([-2, BELOW, HALF_BEAM], [-2, BELOW, 11.5]); // leader to the label beyond the starboard side
    }
    if (d.Line === 'draught') {
      // Vertical line just ahead of the bow, outside the hull, from the waterline down to keel level.
      seg([DRAUGHT_X, 0, PORT_OFF], [DRAUGHT_X, -DRAUGHT, PORT_OFF]);
      tick(DRAUGHT_X, 0, PORT_OFF, 'x'); tick(DRAUGHT_X, -DRAUGHT, PORT_OFF, 'x');
      seg([HALF - 1.7, 0, 0], [DRAUGHT_X + 1, 0, PORT_OFF]);        // from the waterline at the stem
      seg([36, -DRAUGHT, 0], [DRAUGHT_X + 1, -DRAUGHT, PORT_OFF]);  // from the bottom of the keel (flat keel ends ~36 m forward of midships)
    }
  }
  return p;
}

/** Thin dark measurement lines and a waterline outline; drawn only in Technical view. */
export function ShipDimensions({ dims }: { dims: ExteriorDimension[] }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(segments(dims), 3));
    return g;
  }, [dims]);
  const waterline = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-HALF - 6, 0.02, PORT_OFF - 3.2, HALF + 6, 0.02, PORT_OFF - 3.2], 3));
    return g;
  }, []);
  return (
    <group>
      <lineSegments geometry={geom} raycast={() => null}>
        <lineBasicMaterial color="#7d6533" />
      </lineSegments>
      <lineSegments geometry={waterline} raycast={() => null}>
        <lineBasicMaterial color="#426a7a" />
      </lineSegments>
    </group>
  );
}
