import { useDataState } from '../data/DataContext';
import { useLang } from '../i18n/LanguageContext';

/** Page text from site_content.json in the current language, falling back to English. */
export function useContent() {
  const { state } = useDataState();
  const { lang } = useLang();
  const content = state.status === 'ready' ? state.data.content : null;
  return (key: string): string => content?.[lang]?.[key] || content?.en?.[key] || '';
}
