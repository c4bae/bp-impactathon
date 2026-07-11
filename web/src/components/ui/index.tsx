// =====================================================================
// Shared accessible UI primitives. Contributors: BUILD WITH THESE. They
// bake in focus rings, hit targets (>=44px), ARIA, and the color tokens.
// Do not hand-roll buttons/badges in feature code.
// =====================================================================
import React from 'react';
import {
  ACCOMMODATION_LABELS, BADGE_LABELS,
  type AccommodationTag, type BadgeState,
} from '../../../../shared/models';

// ---- Button ----------------------------------------------------------
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
};
export function Button({ variant = 'primary', loading, className = '', children, disabled, ...rest }: BtnProps) {
  const base = 'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed';
  const styles = {
    primary: 'bg-brand text-white hover:bg-brand-dark',
    secondary: 'bg-brand-light text-brand-dark hover:bg-[#d6e9e2]',
    ghost: 'bg-transparent text-brand-dark hover:bg-brand-light',
  }[variant];
  return (
    <button className={`${base} ${styles} ${className}`} disabled={disabled || loading} aria-busy={loading} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

// ---- Card ------------------------------------------------------------
export function Card({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-xl border border-black/10 bg-white p-4 shadow-sm ${className}`} {...rest}>
      {children}
    </div>
  );
}

// ---- Accessibility badge --------------------------------------------
export function AccessibilityBadge({ state }: { state: BadgeState }) {
  const map: Record<BadgeState, { cls: string; icon: string }> = {
    confirmed: { cls: 'bg-brand-light text-badge-confirmed', icon: '✓' },
    reported_gap: { cls: 'bg-orange-100 text-badge-gap', icon: '⚠' },
    not_yet_verified: { cls: 'bg-gray-100 text-badge-unverified', icon: '○' },
  };
  const { cls, icon } = map[state];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium ${cls}`}>
      <span aria-hidden>{icon}</span>
      {BADGE_LABELS[state]}
    </span>
  );
}

// ---- Accommodation tag chip -----------------------------------------
export function TagChip({ tag }: { tag: AccommodationTag }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-light px-2.5 py-1 text-sm text-brand-dark">
      {ACCOMMODATION_LABELS[tag]}
    </span>
  );
}

// ---- Toggle (switch) -------------------------------------------------
export function Toggle({ pressed, onToggle, label }: { pressed: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      onClick={onToggle}
      className={`inline-flex items-center gap-2 min-h-[44px] px-3 rounded-lg border ${pressed ? 'border-brand bg-brand-light text-brand-dark' : 'border-black/15'}`}
    >
      <span aria-hidden>{pressed ? '🔊' : '🔈'}</span>
      {label}
    </button>
  );
}

// ---- Field (label + control + error, wired for a11y) -----------------
export function Field({
  label, htmlFor, hint, error, children,
}: { label: string; htmlFor: string; hint?: string; error?: string; children: React.ReactNode }) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errId = error ? `${htmlFor}-err` : undefined;
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="block font-medium mb-1">{label}</label>
      {hint && <p id={hintId} className="text-muted text-sm mb-1">{hint}</p>}
      {React.isValidElement(children)
        ? React.cloneElement(children as any, {
            id: htmlFor,
            'aria-describedby': hintId,
            'aria-invalid': !!error,
            'aria-errormessage': errId,
          })
        : children}
      {error && <p id={errId} role="alert" className="text-badge-gap text-sm mt-1">{error}</p>}
    </div>
  );
}

// ---- Spinner ---------------------------------------------------------
export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span role="status" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent">
      <span className="sr-only">{label}</span>
    </span>
  );
}

// ---- Distance / transit badge ---------------------------------------
export function DistanceBadge({ km }: { km: number | null }) {
  if (km == null) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted">
      <span aria-hidden>📍</span>{km} km away
    </span>
  );
}
