import type { StringKey } from '../i18n/strings';

// Navigation order follows the exhibition sequence; numbers are meaningful here.
export const NAV_ITEMS: { to: string; key: StringKey }[] = [
  { to: '/', key: 'nav_home' },
  { to: '/story', key: 'nav_story' },
  { to: '/voyage', key: 'nav_voyage' },
  { to: '/ship', key: 'nav_ship' },
  { to: '/onboard', key: 'nav_onboard' },
  { to: '/legacy', key: 'nav_legacy' },
  { to: '/sources', key: 'nav_sources' },
];
