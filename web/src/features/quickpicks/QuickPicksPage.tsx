import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useSession } from '../../lib/session';
import { CATEGORY_LABELS, type EventCategory } from '../../../../shared/models';
import { Button, Card, Spinner } from '../../components/ui';

// Contributor 2 — Quick Picks: daily 3-prompt card, one category at a time.
// Each 👍/👎 feeds the weighted-count ranking heuristic behind /feed.
export function QuickPicksPage() {
  const { userId } = useSession();
  const [categories, setCategories] = useState<EventCategory[] | null>(null);
  const [index, setIndex] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [submitNote, setSubmitNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCategories(null);
    setIndex(0);
    setLoadError(false);
    setSubmitNote(null);
    api.quickPicksToday(userId)
      .then((r) => { if (!cancelled) setCategories(r.categories); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [userId]);

  function vote(category: EventCategory, response: boolean) {
    // Optimistic: advance immediately; a failed save is noted but never
    // retreats the card.
    api.submitQuickPick(userId, category, response).catch(() =>
      setSubmitNote('One answer failed to save — it may not count toward your feed today.'),
    );
    setIndex((i) => i + 1);
  }

  if (loadError) {
    return (
      <Card className="max-w-md mx-auto text-center">
        <p className="mb-3">Could not load today’s Quick Picks.</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </Card>
    );
  }

  if (categories === null) {
    return (
      <div className="flex justify-center py-12">
        <Spinner label="Loading Quick Picks" />
      </div>
    );
  }

  const done = index >= categories.length;

  if (done) {
    return (
      <Card className="max-w-md mx-auto text-center">
        <h1 className="text-2xl font-semibold mb-2">
          {categories.length > 0 ? 'That’s it for today! 🎉' : 'All caught up! 🎉'}
        </h1>
        <p className="text-muted mb-4">
          Your picks help us rank events you’ll actually like. Come back tomorrow for more.
        </p>
        <Link
          to="/feed"
          className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg font-medium bg-brand text-white hover:bg-brand-dark"
        >
          See your feed
        </Link>
      </Card>
    );
  }

  const category = categories[index];

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Quick Picks</h1>
        <div className="flex items-center gap-2">
          <span className="flex gap-1" aria-hidden>
            {categories.map((c, i) => (
              <span
                key={c}
                className={`h-2.5 w-2.5 rounded-full ${i < index ? 'bg-brand' : i === index ? 'bg-brand-dark' : 'bg-black/15'}`}
              />
            ))}
          </span>
          <span className="text-sm text-muted">{index + 1} of {categories.length}</span>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        Question {index + 1} of {categories.length}
      </p>

      <Card className="text-center py-8">
        <h2 className="text-xl mb-6">
          Interested in <strong>{CATEGORY_LABELS[category]}</strong> events?
        </h2>
        <div className="flex justify-center gap-3">
          <Button onClick={() => vote(category, true)} className="min-w-[130px] text-lg">
            <span aria-hidden>👍</span> Yes
          </Button>
          <Button variant="secondary" onClick={() => vote(category, false)} className="min-w-[130px] text-lg">
            <span aria-hidden>👎</span> Not for me
          </Button>
        </div>
      </Card>

      {submitNote && <p role="alert" className="text-badge-gap text-sm mt-3">{submitNote}</p>}
    </div>
  );
}
