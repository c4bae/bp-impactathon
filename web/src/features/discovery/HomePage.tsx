import { Placeholder } from '../../components/Placeholder';

// Contributor 1 — Screen: Home / question-led entry.
// Build 2–3 tap-first prompts, then navigate to /feed with the chosen
// filters as query params. See docs/contributor-1-discovery.md §Screens.
export function HomePage() {
  return (
    <Placeholder owner="Contributor 1 · Discovery" doc="contributor-1-discovery.md" title="Home — question-led entry">
      2–3 prompts → ranked feed. Uses <code>api.feed()</code>.
    </Placeholder>
  );
}
