// Map settings in one place so the tile provider can be swapped without touching components.
//
// Default: OpenStreetMap standard tiles (free, no API key). The OSM tile servers are run by
// volunteers; their usage policy (https://operations.osmfoundation.org/policies/tiles/) asks
// for attribution, no bulk downloading and modest traffic. For a high-traffic public launch,
// switch to a commercial or self-hosted provider by editing TILE_URL and TILE_ATTRIBUTION.
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const TILE_MAX_ZOOM = 18;

// Initial view (Strait of Malacca) used before a voyage is chosen.
export const DEFAULT_CENTER: [number, number] = [4.2, 100.6];
export const DEFAULT_ZOOM = 5;

// Playback timing
export const DWELL_MS = 900;            // pause at each named port during playback
export const MIN_DURATION_S = 8;        // shortest full voyage at 1x
export const MAX_DURATION_S = 26;       // longest full voyage at 1x
export const NM_PER_SECOND = 450;       // nominal playback rate before clamping
export const SPEEDS = [0.5, 1, 2, 4];   // speed control choices
