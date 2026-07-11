import { useParams } from 'react-router-dom';
import { Placeholder } from '../../components/Placeholder';

// Contributor 2 — Screen: Route guidance.
// Leaflet map + step list, step-free/stairs indicator, spoken-directions
// toggle (useReadAloud). Hand-authored route via api.route(eventId).
// See docs/contributor-2-ranking-wayfinding.md.
export function RouteGuidancePage() {
  const { id } = useParams();
  return (
    <Placeholder owner="Contributor 2 · Ranking & Wayfinding" doc="contributor-2-ranking-wayfinding.md" title="Route guidance">
      <code>api.route('{id}')</code> → Leaflet map + ordered steps + step-free badge.
    </Placeholder>
  );
}
