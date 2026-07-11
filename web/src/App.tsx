import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/AppShell';

// ---- Feature entry points (each owned by one contributor) ------------
// Contributor 1 — Seeker Discovery
import { HomePage } from './features/discovery/HomePage';
import { FeedPage } from './features/discovery/FeedPage';
import { EventDetailPage } from './features/discovery/EventDetailPage';
// Contributor 2 — Ranking & Wayfinding
import { QuickPicksPage } from './features/quickpicks/QuickPicksPage';
import { RouteGuidancePage } from './features/route/RouteGuidancePage';
// Contributor 3 — Accountability Loop
import { SignupPage } from './features/accountability/SignupPage';
import { MySignupsPage } from './features/accountability/MySignupsPage';
// Contributor 4 — Org & Admin
import { OrgScorecardPage } from './features/org/OrgScorecardPage';
import { CreateEventChoicePage } from './features/admin/CreateEventChoicePage';
import { VoiceCreatePage } from './features/admin/VoiceCreatePage';
import { FormCreatePage } from './features/admin/FormCreatePage';

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/events/:id/route" element={<RouteGuidancePage />} />
          <Route path="/quick-picks" element={<QuickPicksPage />} />
          <Route path="/signup/:eventId" element={<SignupPage />} />
          <Route path="/my-signups" element={<MySignupsPage />} />
          <Route path="/org" element={<OrgScorecardPage />} />
          <Route path="/admin/new" element={<CreateEventChoicePage />} />
          <Route path="/admin/new/voice" element={<VoiceCreatePage />} />
          <Route path="/admin/new/form" element={<FormCreatePage />} />
          <Route path="*" element={<p>Page not found. <a className="text-brand underline" href="/">Go home</a></p>} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
