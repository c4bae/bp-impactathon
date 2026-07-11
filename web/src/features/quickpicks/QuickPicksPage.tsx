import { Placeholder } from '../../components/Placeholder';

// Contributor 2 — Screen: Quick Picks.
// Daily 3-prompt card, tap yes/no. Feeds the ranking weights.
// See docs/contributor-2-ranking-wayfinding.md.
export function QuickPicksPage() {
  return (
    <Placeholder owner="Contributor 2 · Ranking & Wayfinding" doc="contributor-2-ranking-wayfinding.md" title="Quick Picks">
      <code>api.quickPicksToday()</code> → 3 category cards → <code>api.submitQuickPick()</code>.
    </Placeholder>
  );
}
