// Contributor 1 — decorative event "cover" tiles. Events have no image
// field, so covers are deterministic gradient + category icon (Luma-style
// thumbnails without asset hosting).
import {
  Palette, Bike, BookOpen, Users, HeartPulse, Briefcase, Baby,
  UtensilsCrossed, Trees, Laptop, type LucideIcon,
} from 'lucide-react';
import type { EventCategory } from '../../../../shared/models';

export const CATEGORY_ICONS: Record<EventCategory, LucideIcon> = {
  arts: Palette, sports: Bike, education: BookOpen, social: Users,
  health: HeartPulse, employment: Briefcase, family: Baby,
  food: UtensilsCrossed, outdoors: Trees, tech: Laptop,
};

const TILE: Record<EventCategory, string> = {
  arts: 'from-pink-100 to-rose-200 text-rose-700',
  sports: 'from-orange-100 to-amber-200 text-amber-700',
  education: 'from-sky-100 to-blue-200 text-blue-700',
  social: 'from-violet-100 to-purple-200 text-purple-700',
  health: 'from-emerald-100 to-teal-200 text-teal-700',
  employment: 'from-slate-100 to-gray-200 text-gray-700',
  family: 'from-yellow-100 to-amber-200 text-amber-700',
  food: 'from-red-100 to-orange-200 text-orange-700',
  outdoors: 'from-green-100 to-emerald-200 text-emerald-700',
  tech: 'from-cyan-100 to-sky-200 text-sky-700',
};

export function EventCover({ category, className = '', iconClassName = 'w-8 h-8' }: {
  category: EventCategory[];
  className?: string;
  iconClassName?: string;
}) {
  const c: EventCategory = category[0] ?? 'social';
  const Icon = CATEGORY_ICONS[c];
  return (
    <div
      aria-hidden
      className={`bg-gradient-to-br ${TILE[c]} rounded-xl flex items-center justify-center select-none shrink-0 ${className}`}
    >
      <Icon className={iconClassName} strokeWidth={1.75} />
    </div>
  );
}
