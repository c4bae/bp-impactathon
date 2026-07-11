// Contributor 1 — shared event-detail content + fetch hook, rendered by
// both the full page (/events/:id) and the slide-over panel on Discover.
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Ticket } from 'lucide-react';
import { api, ApiError, type EventDetail } from '../../api/client';
import { Card, AccessibilityBadge, TagChip, Toggle } from '../../components/ui';
import { useReadAloud } from '../../hooks/useReadAloud';
import { CATEGORY_LABELS } from '../../../../shared/models';
import { formatCost, formatLongDate, formatTimeRange } from './format';
import { EventCover } from './covers';

const EventLocationMap = lazy(() => import('./EventLocationMap').then((module) => ({ default: module.EventLocationMap })));

export type DetailStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'error';

export function useEventDetail(id: string | null | undefined) {
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [status, setStatus] = useState<DetailStatus>('idle');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id) { setStatus('idle'); setDetail(null); return; }
    let cancelled = false;
    setStatus('loading');
    api.event(id)
      .then((d) => { if (!cancelled) { setDetail(d); setStatus('ready'); } })
      .catch((err) => {
        if (!cancelled) setStatus(err instanceof ApiError && err.status === 404 ? 'missing' : 'error');
      });
    return () => { cancelled = true; };
  }, [id, attempt]);

  return { detail, status, retry: () => setAttempt((a) => a + 1) };
}

export function EventDetailBody({ detail, titleAs: TitleTag = 'h1', showLocationMap = false }: {
  detail: EventDetail;
  titleAs?: 'h1' | 'h2';
  showLocationMap?: boolean;
}) {
  const { speak, stop, speaking } = useReadAloud();
  useEffect(() => stop, [stop]);
  const SectionHeading = TitleTag === 'h1' ? 'h2' : 'h3';
  const readAloudText = [
    detail.title,
    detail.plain_language_description ?? detail.description,
  ].join('. ');

  return (
    <div className="flex flex-col gap-6">
      <EventCover title={detail.title} category={detail.category} className="w-full h-56 sm:h-72 rounded-2xl" />

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <AccessibilityBadge state={detail.accessibility_badge_state} />
          {detail.category.map((c) => (
            <span key={c} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-sm text-muted">
              {CATEGORY_LABELS[c]}
            </span>
          ))}
        </div>

        <TitleTag className="text-3xl font-bold tracking-tight leading-tight m-0">{detail.title}</TitleTag>

        <div className="flex flex-col gap-2 text-muted">
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
              <CalendarDays className="h-5 w-5" aria-hidden />
            </span>
            <p className="m-0 flex flex-col leading-tight">
              <span className="font-display text-lg font-bold">{formatLongDate(detail.date_start)}</span>
              <span className="mt-1 text-sm font-semibold text-amber-800">
                {formatTimeRange(detail.date_start, detail.date_end)}
              </span>
            </p>
          </div>
          {detail.location_address && (
            <p className="m-0 flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0" aria-hidden />
              {detail.location_address}
            </p>
          )}
          <p className="m-0 flex items-center gap-2">
            <Ticket className="w-4 h-4 shrink-0" aria-hidden />
            {formatCost(detail.cost, detail.cost_amount)}
            {detail.age_group && <> · {detail.age_group}</>}
          </p>
        </div>

        <div>
          <Toggle
            pressed={speaking}
            label={speaking ? 'Stop reading' : 'Read this aloud'}
            onToggle={() => (speaking ? stop() : speak(readAloudText))}
          />
        </div>
      </div>

      <Card className="p-5 rounded-2xl flex flex-col gap-3">
        <Link
          to={`/signup/${detail.id}`}
          className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-full font-display font-medium text-lg bg-brand text-white hover:bg-brand-dark"
        >
          Sign me up
        </Link>
        {detail.route && (
          <Link
            to={`/events/${detail.id}/route`}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-full font-display font-medium bg-brand-light text-brand-dark hover:bg-[#d6e9e2]"
          >
            How do I get there?
          </Link>
        )}
        <p className="m-0 text-sm text-muted">Hosted by {detail.org_name}</p>
      </Card>

      {showLocationMap && detail.location_lat != null && detail.location_lng != null && (
        <Suspense fallback={<Card className="h-56 rounded-2xl flex items-center justify-center text-muted">Loading location map…</Card>}>
          <EventLocationMap event={detail} />
        </Suspense>
      )}

      {detail.plain_language_description && (
        <section>
          <SectionHeading className="text-sm font-semibold uppercase tracking-wide text-muted mb-2">In plain words</SectionHeading>
          <Card className="p-5 rounded-2xl bg-brand-light border-transparent">
            <p className="m-0">{detail.plain_language_description}</p>
          </Card>
        </section>
      )}

      {detail.accommodation_tags.length > 0 && (
        <section>
          <SectionHeading className="text-sm font-semibold uppercase tracking-wide text-muted mb-2">What this event offers</SectionHeading>
          <div className="flex gap-1.5 flex-wrap">
            {detail.accommodation_tags.map((t) => <TagChip key={t} tag={t} />)}
          </div>
        </section>
      )}

      <section>
        <SectionHeading className="text-sm font-semibold uppercase tracking-wide text-muted mb-2">About this event</SectionHeading>
        <p className="m-0">{detail.description}</p>
      </section>
    </div>
  );
}
