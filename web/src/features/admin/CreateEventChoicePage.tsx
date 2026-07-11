import { Link } from 'react-router-dom';
import { Card } from '../../components/ui';

// Contributor 4 — entry to the two create paths. Form is the reliable
// fallback; voice is the stretch. See docs/contributor-4-org-admin-ai.md.
export function CreateEventChoicePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-brand-dark">Post an event</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-semibold">By form</h2>
          <p className="text-muted text-sm mt-1">Type the details. Always available.</p>
          <Link to="/admin/new/form" className="text-brand underline mt-2 inline-block">Open form →</Link>
        </Card>
        <Card>
          <h2 className="font-semibold">By voice</h2>
          <p className="text-muted text-sm mt-1">Speak it; we structure it for you to confirm.</p>
          <Link to="/admin/new/voice" className="text-brand underline mt-2 inline-block">Start voice →</Link>
        </Card>
      </div>
    </div>
  );
}
