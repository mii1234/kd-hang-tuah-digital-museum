import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ImageFrame } from './ImageFrame';
import { useLang } from '../i18n/LanguageContext';
import './Lightbox.css';

export interface LightboxItem {
  src?: string;
  alt: string;
  caption?: string;
  credit?: string;
  meta?: string;
}

interface Props {
  items: LightboxItem[];
  index: number | null;
  onChange: (index: number) => void;
  onClose: () => void;
  title?: string;
}

export function Lightbox({ items, index, onChange, onClose, title }: Props) {
  const { t } = useLang();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<Element | null>(null);
  const open = index !== null && items.length > 0;
  const count = items.length;

  const go = useCallback((delta: number) => {
    if (index === null) return;
    onChange((index + delta + count) % count);
  }, [index, count, onChange]);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      (returnFocus.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowRight' && count > 1) { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft' && count > 1) { e.preventDefault(); go(-1); }
      else if (e.key === 'Tab' && dialogRef.current) {
        // keep focus inside the dialog
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, go, onClose, count]);

  if (!open || index === null) return null;
  const item = items[Math.min(index, count - 1)];

  return createPortal(
    <div className="lightbox on-dark" role="dialog" aria-modal="true" aria-label={title ?? item.alt} ref={dialogRef}>
      <div className="lightbox__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="lightbox__frame">
        <div className="lightbox__top">
          <span className="mono lightbox__count" aria-live="polite">{t('image_of', { a: index + 1, b: count })}</span>
          <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label={t('close')}>
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <div className="lightbox__stage">
          {count > 1 && (
            <button type="button" className="icon-btn lightbox__nav lightbox__nav--prev" onClick={() => go(-1)} aria-label={t('previous_image')}>
              <ChevronLeft size={28} aria-hidden="true" />
            </button>
          )}
          <div className="lightbox__image" key={index}>
            <ImageFrame src={item.src} alt={item.alt} caption={item.caption} ratio="3 / 2" eager tone="dark" />
          </div>
          {count > 1 && (
            <button type="button" className="icon-btn lightbox__nav lightbox__nav--next" onClick={() => go(1)} aria-label={t('next_image')}>
              <ChevronRight size={28} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="lightbox__caption">
          {title && <p className="lightbox__title">{title}</p>}
          {item.caption && <p>{item.caption}</p>}
          <p className="muted lightbox__credit">{item.credit ? `${t('credit')}: ${item.credit}` : t('no_credit')}{item.meta ? ` — ${item.meta}` : ''}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
