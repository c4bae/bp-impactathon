import { Placeholder } from '../../components/Placeholder';

// Contributor 4 — Screen: Org scorecard.
// Signups vs attendance, ranked blockers (suppression already applied
// server-side), retention/repeat rate, resolve-gap action that flips the
// badge. api.scorecard(orgId) / api.resolveGap().
// See docs/contributor-4-org-admin-ai.md.
export function OrgScorecardPage() {
  return (
    <Placeholder owner="Contributor 4 · Org & Admin & AI" doc="contributor-4-org-admin-ai.md" title="Org scorecard">
      <code>api.scorecard(orgId)</code> → metrics + ranked blockers + <code>api.resolveGap()</code> button.
    </Placeholder>
  );
}
