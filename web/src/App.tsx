import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useSession } from './lib/session';

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
import { CalendarPage } from './features/calendar/CalendarPage';
import { OrgScorecardPage } from './features/org/OrgScorecardPage';
import { CreateEventChoicePage } from './features/admin/CreateEventChoicePage';
import { VoiceCreatePage } from './features/admin/VoiceCreatePage';
import { FormCreatePage } from './features/admin/FormCreatePage';

/** Event create/dictate flows are organizer-only in the demo. */
function OrgOnly({ children }: { children: React.ReactNode }) {
  const { view } = useSession();
  if (view !== 'org') return <Navigate to="/calendar" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/events/:id/route" element={<RouteGuidancePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/quick-picks" element={<QuickPicksPage />} />
          <Route path="/signup/:eventId" element={<SignupPage />} />
          <Route path="/my-signups" element={<MySignupsPage />} />
          <Route path="/org" element={<OrgScorecardPage />} />
          <Route path="/admin/new" element={<OrgOnly><CreateEventChoicePage /></OrgOnly>} />
          <Route path="/admin/new/voice" element={<OrgOnly><VoiceCreatePage /></OrgOnly>} />
          <Route path="/admin/new/form" element={<OrgOnly><FormCreatePage /></OrgOnly>} />
          <Route path="*" element={<p>Page not found. <a className="text-brand underline" href="/">Go home</a></p>} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
