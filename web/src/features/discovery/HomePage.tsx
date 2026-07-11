import { FeedPage } from './FeedPage';

// Contributor 1 — Home and the feed are one merged content-first Discover
// screen (user decision: simplest navigation). Both / and /feed render it.
export function HomePage() {
  return <FeedPage />;
}
