// Turns a path from the JSON ("/images/ship/hero.jpg") into a URL that works
// wherever the site is hosted, including sub-folders. External URLs pass through.
export function assetUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) return path;
  const base = import.meta.env.BASE_URL || '/';
  return base.replace(/\/$/, '') + '/' + path.replace(/^\.?\//, '');
}

/** True only for http(s) links that are safe to open in a new tab. */
export function isUsableUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
