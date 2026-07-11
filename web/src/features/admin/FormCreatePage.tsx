import { Placeholder } from '../../components/Placeholder';

// Contributor 4 — Screen: Create event by form (the reliable fallback).
// Controlled form -> api.createEvent(). If plain_language_description is
// left blank, the server auto-simplifies. This is ALSO the review UI the
// voice flow reuses. See docs/contributor-4-org-admin-ai.md.
export function FormCreatePage() {
  return (
    <Placeholder owner="Contributor 4 · Org & Admin & AI" doc="contributor-4-org-admin-ai.md" title="Create event by form">
      controlled fields → <code>api.createEvent(body)</code>. Reused as the voice review screen.
    </Placeholder>
  );
}
