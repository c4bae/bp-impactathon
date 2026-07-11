// Contributor 1 — Luma-style slide-over: event details in a right-side
// dialog above Discover. Esc / backdrop / ✕ close it; focus is trapped
// inside and returned to the opener on close.
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, ExternalLink } from 'lucide-react';
import { Button, Card, Spinner } from '../../components/ui';
import { EventDetailBody, useEventDetail } from './EventDetailBody';

export function EventDetailPanel({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const { detail, status, retry } = useEventDetail(eventId);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Event details"
        className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl overflow-y-auto"
      >
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5 px-5 py-3 flex items-center justify-between gap-3">
          <button
            ref={closeRef}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-full font-medium text-ink hover:bg-black/5"
          >
            <X className="w-4 h-4" aria-hidden /> Close
          </button>
          <Link to={`/events/${eventId}`} className="inline-flex items-center gap-1 text-sm text-brand-dark underline">
            Open full page <ExternalLink className="w-3.5 h-3.5" aria-hidden />
          </Link>
        </div>

        <div className="p-5 pb-10">
          {(status === 'loading' || status === 'idle') && (
            <p className="flex items-center gap-2 text-muted"><Spinner /> Loading event…</p>
          )}
          {status === 'missing' && (
            <Card className="p-6 rounded-2xl">
              <p className="m-0">We couldn't find that event. It may have been removed.</p>
            </Card>
          )}
          {status === 'error' && (
            <Card role="alert" className="p-6 rounded-2xl">
              <p className="mb-3">Something went wrong loading this event. It's not you — let's try again.</p>
              <Button onClick={retry} className="rounded-full">Try again</Button>
            </Card>
          )}
          {status === 'ready' && detail && <EventDetailBody detail={detail} titleAs="h2" />}
        </div>
      </div>
    </div>
  );
}
