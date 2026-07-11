import { useEffect, useRef, useState } from 'react';
import { Minus, PersonStanding, Plus, RotateCcw, X } from 'lucide-react';

type ToggleSetting =
  | 'contrast'
  | 'grayscale'
  | 'readableFont'
  | 'underlineLinks'
  | 'roomyText'
  | 'reduceMotion'
  | 'hideImages'
  | 'strongFocus';

type Settings = Record<ToggleSetting, boolean> & { textSize: number };

const STORAGE_KEY = 'kwhab-accessibility-preferences';
const defaults: Settings = {
  textSize: 100,
  contrast: false,
  grayscale: false,
  readableFont: false,
  underlineLinks: false,
  roomyText: false,
  reduceMotion: false,
  hideImages: false,
  strongFocus: false,
};

const options: { key: ToggleSetting; label: string; description: string }[] = [
  { key: 'contrast', label: 'High contrast', description: 'Use stronger foreground and background colours' },
  { key: 'grayscale', label: 'Grayscale', description: 'Remove colour from the page' },
  { key: 'readableFont', label: 'Readable font', description: 'Use a clear, consistent typeface' },
  { key: 'underlineLinks', label: 'Underline links', description: 'Make links easier to identify' },
  { key: 'roomyText', label: 'More text spacing', description: 'Increase line and letter spacing' },
  { key: 'reduceMotion', label: 'Pause animations', description: 'Reduce movement and transitions' },
  { key: 'hideImages', label: 'Hide images', description: 'Hide decorative and content images' },
  { key: 'strongFocus', label: 'Highlight focus', description: 'Make keyboard focus more prominent' },
];

function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return { ...defaults, ...saved };
  } catch {
    return defaults;
  }
}

function applySettings(settings: Settings) {
  const root = document.documentElement;
  root.style.setProperty('--a11y-text-scale', String(settings.textSize / 100));
  for (const key of options.map((option) => option.key)) {
    root.toggleAttribute(`data-a11y-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, settings[key]);
  }
}

export function AccessibilityMenu() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applySettings(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>('button')?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  const toggle = (key: ToggleSetting) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
  };

  const reset = () => setSettings(defaults);
  const hasChanges = JSON.stringify(settings) !== JSON.stringify(defaults);

  return (
    <div className="a11y-widget">
      {open && (
        <div
          ref={panelRef}
          id="accessibility-menu"
          role="dialog"
          aria-modal="false"
          aria-labelledby="accessibility-menu-title"
          className="a11y-panel"
        >
          <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4">
            <div>
              <h2 id="accessibility-menu-title" className="text-lg font-bold text-ink">Accessibility tools</h2>
              <p className="mt-0.5 text-sm text-muted">Adjust this site to suit you.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="a11y-icon-button" aria-label="Close accessibility tools">
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <div className="max-h-[min(62vh,520px)] overflow-y-auto px-5 py-4">
            <fieldset>
              <legend className="text-sm font-semibold text-ink">Text size</legend>
              <div className="mt-2 flex items-center justify-between rounded-xl bg-brand-light/60 p-2">
                <button type="button" className="a11y-icon-button" onClick={() => setSettings((s) => ({ ...s, textSize: Math.max(90, s.textSize - 10) }))} disabled={settings.textSize <= 90} aria-label="Decrease text size">
                  <Minus size={19} aria-hidden="true" />
                </button>
                <output className="font-semibold tabular-nums" aria-live="polite">{settings.textSize}%</output>
                <button type="button" className="a11y-icon-button" onClick={() => setSettings((s) => ({ ...s, textSize: Math.min(130, s.textSize + 10) }))} disabled={settings.textSize >= 130} aria-label="Increase text size">
                  <Plus size={19} aria-hidden="true" />
                </button>
              </div>
            </fieldset>

            <div className="mt-4 grid gap-2">
              {options.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  role="switch"
                  aria-checked={settings[option.key]}
                  onClick={() => toggle(option.key)}
                  className="a11y-option"
                >
                  <span className="text-left">
                    <span className="block font-semibold text-ink">{option.label}</span>
                    <span className="block text-xs text-muted">{option.description}</span>
                  </span>
                  <span className="a11y-switch" aria-hidden="true"><span /></span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-black/10 px-5 py-3">
            <button type="button" onClick={reset} disabled={!hasChanges} className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-40">
              <RotateCcw size={16} aria-hidden="true" /> Reset settings
            </button>
          </div>
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        className="a11y-trigger"
        aria-expanded={open}
        aria-controls="accessibility-menu"
        onClick={() => setOpen((value) => !value)}
      >
        <PersonStanding size={28} strokeWidth={2.2} aria-hidden="true" />
        <span className="sr-only">{open ? 'Close' : 'Open'} accessibility tools</span>
      </button>
    </div>
  );
}
