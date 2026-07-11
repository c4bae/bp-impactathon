import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card, Button, Spinner } from '../../components/ui';
import { EventDetailBody, useEventDetail } from './EventDetailBody';

// Contributor 1 — Screen: full event detail page (/events/:id). Used for
// direct links and "Open full page" from the Discover slide-over, which
// renders the same EventDetailBody.
export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { detail, status, retry } = useEventDetail(id);

  if (status === 'loading' || status === 'idle') {
    return <p className="flex items-center gap-2 text-muted"><Spinner /> Loading event…</p>;
  }
  if (status === 'missing') {
    return (
      <Card className="mx-auto max-w-2xl p-6 rounded-2xl">
        <h1 className="text-xl font-bold mb-2">We couldn't find that event</h1>
        <p className="mb-3">It may have been removed.</p>
        <Link to="/" className="inline-flex items-center gap-1 text-brand-dark underline font-medium">
          <ArrowLeft className="w-4 h-4" aria-hidden /> Back to events
        </Link>
      </Card>
    );
  }
  if (status === 'error' || !detail) {
    return (
      <Card role="alert" className="mx-auto max-w-2xl p-6 rounded-2xl">
        <p className="mb-3">Something went wrong loading this event. It's not you — let's try again.</p>
        <Button onClick={retry} className="rounded-full">Try again</Button>
      </Card>
    );
  }

  return (
    <article className="mx-auto max-w-2xl flex flex-col gap-6 py-2">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted underline self-start">
        <ArrowLeft className="w-4 h-4" aria-hidden /> Back to events
      </Link>
      <EventDetailBody detail={detail} titleAs="h1" />
    </article>
  );
}
