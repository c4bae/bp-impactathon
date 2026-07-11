import { useParams } from 'react-router-dom';
import { Placeholder } from '../../components/Placeholder';

// Contributor 1 — Screen: Event detail.
// Full description, accommodation tags, signup CTA (-> /signup/:id),
// "get there" link (-> /events/:id/route). See contributor-1 doc.
export function EventDetailPage() {
  const { id } = useParams();
  return (
    <Placeholder owner="Contributor 1 · Discovery" doc="contributor-1-discovery.md" title="Event detail">
      <code>api.event('{id}')</code> → detail + CTA to <code>/signup/{id}</code> and <code>/events/{id}/route</code>.
    </Placeholder>
  );
}
