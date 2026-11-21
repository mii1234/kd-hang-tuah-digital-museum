// Data for the 3D Ship Explorer: public/data/ship_exterior.json. Kept separate from the rendering
// code so historians can edit names, descriptions and sources without touching the 3D scene.
import type { Verification } from '../../data/types';
import { assetUrl } from '../../utils/assets';

export type ConfigId = 'as_built' | 'later';
export type ComponentConfig = 'shared' | ConfigId;
export type ViewMode = 'realistic' | 'technical';
/** What Technical view shows: the exterior, a wireframe, the structure (decks, bulkheads) or the internal spaces. */
export type Display = 'exterior' | 'wireframe' | 'structural' | 'internal';
/**
 * exterior parts; structural parts (shown in Structural and Internal views); internal spaces (Internal view only);
 * interior parts (Phase 3), shown only while their space is being inspected.
 */
export type ComponentLayer = 'exterior' | 'structural' | 'internal' | 'interior';
/** Spaces that can be inspected from the inside (Phase 3). */
export type SpaceId = 'main_bridge' | 'training_bridge' | 'wheelhouse' | 'engine_room' | 'generator_room';
export const SPACE_IDS: SpaceId[] = ['main_bridge', 'training_bridge', 'wheelhouse', 'engine_room', 'generator_room'];
/** How the model of a part was made, as distinct from the record's Verification. */
export type ModelStatus = 'Supported' | 'Approximate reconstruction' | 'Conceptual' | 'Pending verification';
export type CameraView = 'three_quarter' | 'front' | 'rear' | 'side' | 'top';

export interface ExteriorImage {
  Image_ID: string;
  Caption: string;
  Approved: boolean;
}

export interface ExteriorComponent {
  Component_ID: string;
  Name: string;
  Name_MS?: string;
  Group: string;
  Config: ComponentConfig;
  /** Which display shows the part (default exterior). Structural and internal parts are conceptual. */
  Layer?: ComponentLayer;
  /** The component that takes this one's place in the other configuration, if any. */
  Counterpart_ID?: string;
  /** Mesh (node) names in the GLB model. */
  /** Meshes used to place the marker and aim the camera (default: all of Meshes). */
  Anchor_Meshes?: string[];
  /** false: no numbered marker on the model (the part can still be clicked and chosen from the list). */
  Marker?: boolean;
  Meshes: string[];
  /** Interior parts: the space they belong to. */
  Space?: SpaceId;
  /** A part whose inside can be inspected (for example the bridge). */
  Inspect_Space?: SpaceId;
  Model_Status?: ModelStatus;
  Description: string;
  Function?: string;
  History?: string;
  Model_Accuracy: string;
  Source_IDs: string[];
  Verification: Verification;
  Related_Space_ID?: string;
  /** Reserved for approved photographs and documents (none yet). */
  Imagery: ExteriorImage[];
}

export interface ExteriorDimension {
  Key: string;
  Label: string;
  Label_MS?: string;
  Value_m: number;
  Display: string;
  /** Which measurement line the model draws, or null when the figure cannot be mapped to the model. */
  Line: 'length_overall' | 'beam_max' | 'draught' | null;
  Mapping_Note: string;
  Mapping_Note_MS?: string;
  Source_IDs: string[];
  Verification: Verification;
}

export interface ExteriorConfiguration {
  Config_ID: ConfigId;
  Label: string;
  Label_MS?: string;
  Description: string;
  Description_MS?: string;
  Source_IDs: string[];
}

export interface ShipSpace {
  Space_ID: SpaceId;
  Name: string;
  Name_MS?: string;
  /** The part that opens this space from the list (its panel shows a 'Look inside' button). */
  Component_ID: string;
  Note: string;
  Note_MS?: string;
  Source_IDs: string[];
}

export interface ShipExterior {
  Spaces?: ShipSpace[];
  Interior_Note?: string;
  Interior_Note_MS?: string;
  Model: { File: string; Title: string; Title_MS?: string; Note: string; Note_MS?: string; Source_IDs: string[]; Units: string; Default_Configuration: ConfigId };
  Configurations: ExteriorConfiguration[];
  Comparison_Note: string;
  Comparison_Note_MS?: string;
  Dimensions: ExteriorDimension[];
  Components: ExteriorComponent[];
}

export const EXTERIOR_FILE = 'data/ship_exterior.json';

export async function loadShipExterior(signal?: AbortSignal): Promise<ShipExterior> {
  const res = await fetch(assetUrl(EXTERIOR_FILE), { cache: 'no-cache', signal });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const text = await res.text();
  if (text.trimStart().startsWith('<')) throw new Error('file not found');
  return JSON.parse(text) as ShipExterior;
}

/** Components fitted in a configuration: the shared ones plus that configuration's own. */
export function layersFor(display: Display): ComponentLayer[] {
  return display === 'internal' ? ['exterior', 'structural', 'internal'] : display === 'structural' ? ['exterior', 'structural'] : ['exterior'];
}

/**
 * Components fitted in a configuration and shown by a display. While a space is inspected, only that
 * space's interior parts are listed (interiors belong to the later configuration).
 */
export function componentsFor(data: ShipExterior, config: ConfigId, display: Display = 'exterior', inspect: SpaceId | null = null): ExteriorComponent[] {
  if (inspect) return data.Components.filter((c) => c.Layer === 'interior' && c.Space === inspect && (c.Config === 'shared' || c.Config === config));
  const layers = layersFor(display);
  return data.Components.filter((c) => (c.Config === 'shared' || c.Config === config) && layers.includes(c.Layer ?? 'exterior'));
}

/** Keeps a selection meaningful when the configuration changes (for example 4-inch gun ↔ 57 mm gun). */
export function selectionAfterConfigChange(data: ShipExterior, selectedId: string | null, config: ConfigId): string | null {
  if (!selectedId) return null;
  const c = data.Components.find((x) => x.Component_ID === selectedId);
  if (!c) return null;
  if (c.Config === 'shared' || c.Config === config) return selectedId;
  const counterpart = c.Counterpart_ID ? data.Components.find((x) => x.Component_ID === c.Counterpart_ID) : undefined;
  if (counterpart && (counterpart.Config === 'shared' || counterpart.Config === config)) return counterpart.Component_ID;
  const reverse = data.Components.find((x) => x.Counterpart_ID === c.Component_ID && (x.Config === 'shared' || x.Config === config));
  return reverse ? reverse.Component_ID : null;
}

export interface ExteriorIssue { id: string; message: string }

/**
 * Verified-First rules for the explorer data. Used by npm run validate-data and by the tests;
 * the explorer hides any component that fails them.
 *  - every component, dimension and configuration cites at least one source that exists and is relied on;
 *  - every public component and dimension is Verified;
 *  - every component states how accurate its model is;
 *  - a dimension may draw a measurement line only for length, beam and draught;
 *  - no imagery is listed unless it is approved;
 *  - structural and internal parts say they are conceptual or approximate;
 *  - interior parts name a known space, say they are approximate or representative, and are not part of
 *    the 1977 configuration.
 */
export function checkShipExterior(data: ShipExterior, sources: { Source_ID: string; Relied_On?: boolean }[]): ExteriorIssue[] {
  const issues: ExteriorIssue[] = [];
  const known = new Map(sources.map((s) => [s.Source_ID, s]));
  const checkSources = (id: string, ids: string[] | undefined) => {
    if (!ids || !ids.length) issues.push({ id, message: 'cites no source' });
    for (const s of ids ?? []) {
      const src = known.get(s);
      if (!src) issues.push({ id, message: `cites unknown source ${s}` });
      else if (src.Relied_On === false) issues.push({ id, message: `cites ${s}, which is not relied on` });
    }
  };
  const spaceIds = new Set<string>((data.Spaces ?? []).map((s) => s.Space_ID));
  for (const s of data.Spaces ?? []) {
    if (!SPACE_IDS.includes(s.Space_ID)) issues.push({ id: s.Space_ID, message: 'unknown space' });
    checkSources(s.Space_ID, s.Source_IDs);
    if (!/approximate|conceptual|simple/i.test(s.Note)) issues.push({ id: s.Space_ID, message: 'space note must say the reconstruction is approximate' });
  }
  const ids = new Set<string>();
  for (const c of data.Components ?? []) {
    if (ids.has(c.Component_ID)) issues.push({ id: c.Component_ID, message: 'duplicate Component_ID' });
    ids.add(c.Component_ID);
    if (c.Verification !== 'Verified') issues.push({ id: c.Component_ID, message: `is ${c.Verification}; only Verified components are public` });
    if (!['shared', 'as_built', 'later'].includes(c.Config)) issues.push({ id: c.Component_ID, message: `unknown configuration ${c.Config}` });
    if (!c.Meshes?.length) issues.push({ id: c.Component_ID, message: 'has no model meshes' });
    if (c.Anchor_Meshes?.some((m) => !c.Meshes.includes(m))) issues.push({ id: c.Component_ID, message: 'anchor mesh is not one of its meshes' });
    if (!c.Model_Accuracy?.trim()) issues.push({ id: c.Component_ID, message: 'does not say how accurate the model is' });
    if (c.Layer && !['exterior', 'structural', 'internal', 'interior'].includes(c.Layer)) issues.push({ id: c.Component_ID, message: `unknown layer ${c.Layer}` });
    if ((c.Layer === 'structural' || c.Layer === 'internal' || c.Layer === 'interior') && !/conceptual|approximate|representative/i.test(c.Model_Accuracy ?? '')) issues.push({ id: c.Component_ID, message: 'internal geometry must be labelled conceptual, approximate or representative' });
    if (c.Layer === 'interior' && (!c.Space || !spaceIds.has(c.Space))) issues.push({ id: c.Component_ID, message: 'interior part does not name a known space' });
    if (c.Layer !== 'interior' && c.Space) issues.push({ id: c.Component_ID, message: 'only interior parts belong to a space' });
    if (c.Layer === 'interior' && c.Config === 'as_built') issues.push({ id: c.Component_ID, message: 'interiors are reconstructed from 2026 photographs and cannot belong to the 1977 configuration' });
    if (c.Inspect_Space && !spaceIds.has(c.Inspect_Space)) issues.push({ id: c.Component_ID, message: `unknown space ${c.Inspect_Space}` });
    if (c.Model_Status && !['Supported', 'Approximate reconstruction', 'Conceptual', 'Pending verification'].includes(c.Model_Status)) issues.push({ id: c.Component_ID, message: `unknown model status ${c.Model_Status}` });
    if ((c.Imagery ?? []).some((i) => !i.Approved)) issues.push({ id: c.Component_ID, message: 'lists an image that is not approved' });
    checkSources(c.Component_ID, c.Source_IDs);
  }
  for (const s of data.Spaces ?? []) if (!ids.has(s.Component_ID)) issues.push({ id: s.Space_ID, message: `component ${s.Component_ID} does not exist` });
  for (const c of data.Components ?? []) {
    if (c.Counterpart_ID && !ids.has(c.Counterpart_ID)) issues.push({ id: c.Component_ID, message: `counterpart ${c.Counterpart_ID} does not exist` });
  }
  for (const d of data.Dimensions ?? []) {
    if (d.Verification !== 'Verified') issues.push({ id: d.Key, message: `dimension is ${d.Verification}` });
    if (d.Line && !['length_overall', 'beam_max', 'draught'].includes(d.Line)) issues.push({ id: d.Key, message: `unknown measurement line ${d.Line}` });
    if (!d.Mapping_Note?.trim()) issues.push({ id: d.Key, message: 'does not explain what the figure measures' });
    checkSources(d.Key, d.Source_IDs);
  }
  for (const cfg of data.Configurations ?? []) checkSources(cfg.Config_ID, cfg.Source_IDs);
  checkSources('Model', data.Model?.Source_IDs);
  return issues;
}

// Where the measurement lines are drawn (model metres: +x bow, +y up, +z starboard, y = 0 waterline).
/**
 * Where the camera looks when a space is inspected (model metres: centre of the space, direction from the
 * centre to the camera, distance). Plain numbers, so this file needs no three.js.
 */
export const SPACE_VIEWS: Record<SpaceId, { center: [number, number, number]; dir: [number, number, number]; distance: number }> = {
  main_bridge: { center: [30.4, 8.6, 0], dir: [-0.95, 0.17, -0.22], distance: 8 },
  training_bridge: { center: [25.9, 11.2, 0], dir: [-0.94, 0.26, -0.2], distance: 6.5 },
  wheelhouse: { center: [-3.4, 2.7, 0.3], dir: [-0.35, 0.55, -0.78], distance: 7.5 },
  engine_room: { center: [-15.6, -1.5, 0], dir: [-0.45, 0.6, -0.68], distance: 20 },
  generator_room: { center: [5.1, -1.7, 0], dir: [-0.4, 0.62, -0.7], distance: 16.5 },
};

export const DIM_GEOMETRY = { HALF: 103.5 / 2, HALF_BEAM: 6.1, DRAUGHT: 4.9, BELOW: -7.0, PORT_OFF: -15, DRAUGHT_X: 57 } as const;

export interface ScreenAnchor {
  key: string;
  position: [number, number, number];
  /** Direction of a measurement line; its label is hidden when the line points at the camera. */
  axis?: [number, number, number];
}

/** Screen-label positions for the dimensions that have a line (plain numbers, so this file needs no three.js). */
export function dimensionAnchors(dims: ExteriorDimension[]): ScreenAnchor[] {
  const { BELOW, PORT_OFF, DRAUGHT, DRAUGHT_X } = DIM_GEOMETRY;
  const out: ScreenAnchor[] = [];
  for (const d of dims) {
    if (d.Line === 'length_overall') out.push({ key: `d:${d.Key}`, position: [0, BELOW - 1.4, PORT_OFF], axis: [1, 0, 0] });
    if (d.Line === 'beam_max') out.push({ key: `d:${d.Key}`, position: [-2, BELOW, 14], axis: [0, 0, 1] });
    if (d.Line === 'draught') out.push({ key: `d:${d.Key}`, position: [DRAUGHT_X + 3.5, -DRAUGHT / 2, PORT_OFF], axis: [0, 1, 0] });
  }
  return out;
}
