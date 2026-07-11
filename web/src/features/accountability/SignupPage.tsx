import { useParams } from 'react-router-dom';
import { Placeholder } from '../../components/Placeholder';

// Contributor 3 — Screen: Signup form.
// Basic info + OPTIONAL needs checkboxes (functional needs, never a
// diagnosis), a clear Skip, plain consent copy. api.signup().
// See docs/contributor-3-accountability.md.
export function SignupPage() {
  const { eventId } = useParams();
  return (
    <Placeholder owner="Contributor 3 · Accountability" doc="contributor-3-accountability.md" title="Signup form">
      <code>api.signup(userId, '{eventId}', needs_flagged?)</code>. Optional needs, clear skip, plain consent.
    </Placeholder>
  );
}
