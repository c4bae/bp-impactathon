// Contributor 1 — category-specific stock photography for events that do not
// have their own uploaded image yet. Keeping these assets local makes covers
// reliable in demos and gives every category an immediately recognizable cue.
import type { EventCategory } from '../../../../shared/models';

// Familiar pictograms are easier to identify at a glance than abstract line
// icons. Text labels always appear alongside these in interactive controls.
export const CATEGORY_GLYPHS: Record<EventCategory, string> = {
  arts: '🎨',
  sports: '⚽',
  education: '📚',
  social: '🤝',
  health: '❤️',
  employment: '💼',
  family: '👨‍👩‍👧',
  food: '🍽️',
  outdoors: '🌳',
  tech: '💻',
};

const CATEGORY_COVERS: Record<EventCategory, string> = {
  arts: '/event-covers/arts.jpg',
  sports: '/event-covers/sports.jpg',
  education: '/event-covers/education.jpg',
  social: '/event-covers/social.jpg',
  health: '/event-covers/health.jpg',
  employment: '/event-covers/employment.jpg',
  family: '/event-covers/family.jpg',
  food: '/event-covers/food.jpg',
  outdoors: '/event-covers/outdoors.jpg',
  tech: '/event-covers/tech.jpg',
};

const EVENT_COVERS: { pattern: RegExp; src: string }[] = [
  { pattern: /karaoke|sing along|jukebox|open mic|music|song/i, src: '/event-covers/karaoke.jpg' },
  { pattern: /transit/i, src: '/event-covers/transit.jpg' },
  { pattern: /walk|hike|trail/i, src: '/event-covers/community-walk.jpg' },
  { pattern: /zentangle|watercolou?r|art|paint|coaster|postcard|pebble/i, src: '/event-covers/art-class.jpg' },
  { pattern: /bingo|games?|yahtzee|cards?/i, src: '/event-covers/bingo.jpg' },
  { pattern: /baking|bread|cookie|pizza|brunch|lunch|jam|pickle|ketchup|cheesecake|popcorn/i, src: '/event-covers/baking.jpg' },
  { pattern: /coffee|cafe|hangout|chats?|circles/i, src: '/event-covers/coffee-chat.jpg' },
];

export function eventCoverSrc(title: string, category: EventCategory[]): string {
  return EVENT_COVERS.find(({ pattern }) => pattern.test(title))?.src
    ?? CATEGORY_COVERS[category[0] ?? 'social'];
}

export function EventCover({ title = '', category, className = '' }: {
  title?: string;
  category: EventCategory[];
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden rounded-xl bg-brand-light select-none shrink-0 ${className}`}
    >
      <img
        src={eventCoverSrc(title, category)}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <span className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-[inherit]" />
    </div>
  );
}
