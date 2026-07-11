import { Placeholder } from '../../components/Placeholder';

// Contributor 3 — Screen: Post-event follow-up ("My Signups").
// One-tap attended/not, optional blocker reason. A "simulate day passing"
// button triggers the day-after prompt in the demo. api.reportAttendance()
// recomputes the badge server-side. See docs/contributor-3-accountability.md.
export function MySignupsPage() {
  return (
    <Placeholder owner="Contributor 3 · Accountability" doc="contributor-3-accountability.md" title="My Signups & follow-up">
      <code>api.mySignups()</code> → per signup: attended? + blocker → <code>api.reportAttendance()</code>. Include "simulate day passing".
    </Placeholder>
  );
}
