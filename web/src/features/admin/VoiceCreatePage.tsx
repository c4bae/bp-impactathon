import { Placeholder } from '../../components/Placeholder';

// Contributor 4 — Screen: Create event by voice.
// Record → api.stt(blob) → api.extractEvent(transcript) → editable review
// (reuse the form) → api.createEvent(). Optional: read summary back with
// useReadAloud before confirm. See docs/contributor-4-org-admin-ai.md.
export function VoiceCreatePage() {
  return (
    <Placeholder owner="Contributor 4 · Org & Admin & AI" doc="contributor-4-org-admin-ai.md" title="Create event by voice">
      record → <code>api.stt</code> → <code>api.extractEvent</code> → editable review → <code>api.createEvent</code>.
    </Placeholder>
  );
}
