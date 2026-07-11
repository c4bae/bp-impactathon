import { Placeholder } from '../../components/Placeholder';

// Contributor 1 — Screen: Card feed.
// Ranked cards: badge, tag chips, plain-language line, distance badge,
// per-card read-aloud toggle. See docs/contributor-1-discovery.md.
export function FeedPage() {
  return (
    <Placeholder owner="Contributor 1 · Discovery" doc="contributor-1-discovery.md" title="Card feed">
      <code>api.feed(&#123; user_id &#125;)</code> → map to cards with
      <code> AccessibilityBadge</code>, <code>TagChip</code>, <code>useReadAloud</code>.
    </Placeholder>
  );
}
