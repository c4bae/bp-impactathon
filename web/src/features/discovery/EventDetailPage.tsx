import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError, type EventDetail } from '../../api/client';
import {
  Card, Button, AccessibilityBadge, TagChip, Toggle, Spinner,
} from '../../components/ui';
import { useReadAloud } from '../../hooks/useReadAloud';
import { CATEGORY_LABELS } from '../../../../shared/models';
import { formatCost, formatLongDate, formatTimeRange } from './format';

// Contributor 1 — Screen: Event detail. Full info + CTAs into
// Contributor 3's signup (/signup/:id) and Contributor 2's route
// guidance (/events/:id/route, only when a route exists).
export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const { speak, stop, speaking } = useReadAloud();
  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setStatus('loading');
    api.event(id)
      .then((d) => { if (!cancelled) { setDetail(d); setStatus('ready'); } })
      .catch((err) => {
        if (!cancelled) setStatus(err instanceof ApiError && err.status === 404 ? 'missing' : 'error');
      });
    return () => { cancelled = true; };
  }, [id, attempt]);

  if (status === 'loading') {
    return <p className="flex items-center gap-2 text-muted"><Spinner /> Loading event…</p>;
  }
  if (status === 'missing') {
    return (
      <Card className="mx-auto max-w-xl p-6 rounded-2xl">
        <h1 className="text-xl font-bold mb-2">We couldn't find that event</h1>
        <p className="mb-3">It may have been removed.</p>
        <Link to="/feed" className="text-brand-dark underline font-medium">← Back to events</Link>
      </Card>
    );
  }
  if (status === 'error' || !detail) {
    return (
      <Card role="alert" className="mx-auto max-w-xl p-6 rounded-2xl">
        <p className="mb-3">Something went wrong loading this event. It's not you — let's try again.</p>
        <Button onClick={() => setAttempt((a) => a + 1)} className="rounded-full">Try again</Button>
      </Card>
    );
  }

  const readAloudText = [
    detail.title,
    detail.plain_language_description ?? detail.description,
  ].join('. ');

  return (
    <article className="mx-auto max-w-xl flex flex-col gap-7 py-2">
      <Link to="/feed" className="text-sm text-muted underline self-start">← Back to events</Link>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <AccessibilityBadge state={detail.accessibility_badge_state} />
          {detail.category.map((c) => (
            <span key={c} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-sm text-muted">
              {CATEGORY_LABELS[c]}
            </span>
          ))}
        </div>

        <h1 className="text-4xl font-bold tracking-tight leading-tight">{detail.title}</h1>

        <div className="flex flex-col gap-1 text-muted">
          <p className="m-0">
            <span aria-hidden>🗓</span> {formatLongDate(detail.date_start)} · {formatTimeRange(detail.date_start, detail.date_end)}
          </p>
          {detail.location_address && (
            <p className="m-0"><span aria-hidden>📍</span> {detail.location_address}</p>
          )}
          <p className="m-0">
            <span aria-hidden>🎟</span> {formatCost(detail.cost, detail.cost_amount)}
            {detail.age_group && <> · {detail.age_group}</>}
            {' · '}hosted by {detail.org_name}
          </p>
        </div>

        <div>
          <Toggle
            pressed={speaking}
            label={speaking ? 'Stop reading' : 'Read this page aloud'}
            onToggle={() => (speaking ? stop() : speak(readAloudText))}
          />
        </div>
      </div>

      <Card className="p-5 rounded-2xl flex flex-col gap-3">
        <Link
          to={`/signup/${detail.id}`}
          className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-full font-medium text-lg bg-brand text-white hover:bg-brand-dark"
        >
          Sign me up
        </Link>
        {detail.route && (
          <Link
            to={`/events/${detail.id}/route`}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-full font-medium bg-brand-light text-brand-dark hover:bg-[#d6e9e2]"
          >
            How do I get there?
          </Link>
        )}
      </Card>

      {detail.plain_language_description && (
        <section aria-labelledby="detail-plain-heading">
          <h2 id="detail-plain-heading" className="text-sm font-semibold uppercase tracking-wide text-muted mb-2">In plain words</h2>
          <Card className="p-5 rounded-2xl bg-brand-light border-transparent">
            <p className="m-0">{detail.plain_language_description}</p>
          </Card>
        </section>
      )}

      {detail.accommodation_tags.length > 0 && (
        <section aria-labelledby="detail-access-heading">
          <h2 id="detail-access-heading" className="text-sm font-semibold uppercase tracking-wide text-muted mb-2">What this event offers</h2>
          <div className="flex gap-1.5 flex-wrap">
            {detail.accommodation_tags.map((t) => <TagChip key={t} tag={t} />)}
          </div>
        </section>
      )}

      <section aria-labelledby="detail-about-heading">
        <h2 id="detail-about-heading" className="text-sm font-semibold uppercase tracking-wide text-muted mb-2">About this event</h2>
        <p className="m-0">{detail.description}</p>
      </section>
    </article>
  );
}
