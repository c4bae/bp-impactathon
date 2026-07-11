import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui';
import {
  ACCOMMODATION_LABELS, CATEGORY_LABELS,
  type AccommodationTag, type EventCategory,
} from '../../../../shared/models';

// Contributor 1 — Screen: Home / question-led entry. Three tap-first,
// skippable prompts that map 1:1 onto api.feed() filters, passed to
// /feed as query params. No typing required to proceed.
export function HomePage() {
  const navigate = useNavigate();
  const [cats, setCats] = useState<EventCategory[]>([]);
  const [tags, setTags] = useState<AccommodationTag[]>([]);
  const [freeOnly, setFreeOnly] = useState<boolean | null>(null);

  const toggle = <T,>(list: T[], setList: (v: T[]) => void, item: T) =>
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  function showEvents() {
    const params = new URLSearchParams();
    if (cats.length) params.set('categories', cats.join(','));
    if (tags.length) params.set('tags', tags.join(','));
    if (freeOnly) params.set('free', '1');
    const qs = params.toString();
    navigate(qs ? `/feed?${qs}` : '/feed');
  }

  return (
    <div className="mx-auto max-w-xl flex flex-col gap-9 py-4">
      <div>
        <h1 className="text-4xl font-bold tracking-tight leading-tight mb-2">
          Let's find something fun near you.
        </h1>
        <p className="m-0 text-muted text-lg">
          A few quick questions — all optional.
        </p>
      </div>

      <div role="group" aria-labelledby="q-mood" className="flex flex-col gap-3">
        <h2 id="q-mood" className="text-base font-semibold m-0">What are you in the mood for?</h2>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map((c) => (
            <ChoiceChip key={c} selected={cats.includes(c)} onClick={() => toggle(cats, setCats, c)}>
              {CATEGORY_LABELS[c]}
            </ChoiceChip>
          ))}
        </div>
      </div>

      <div role="group" aria-labelledby="q-comfort" className="flex flex-col gap-3">
        <h2 id="q-comfort" className="text-base font-semibold m-0">
          Anything you need to feel comfortable?
        </h2>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(ACCOMMODATION_LABELS) as AccommodationTag[]).map((t) => (
            <ChoiceChip key={t} selected={tags.includes(t)} onClick={() => toggle(tags, setTags, t)}>
              {ACCOMMODATION_LABELS[t]}
            </ChoiceChip>
          ))}
        </div>
      </div>

      <div role="group" aria-labelledby="q-free" className="flex flex-col gap-3">
        <h2 id="q-free" className="text-base font-semibold m-0">Keep it free?</h2>
        <div className="flex gap-2 flex-wrap">
          <ChoiceChip selected={freeOnly === true} onClick={() => setFreeOnly(freeOnly === true ? null : true)}>
            Free events only
          </ChoiceChip>
          <ChoiceChip selected={freeOnly === false} onClick={() => setFreeOnly(freeOnly === false ? null : false)}>
            Paid is fine too
          </ChoiceChip>
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-3">
        <Button onClick={showEvents} className="rounded-full text-lg py-3">
          Show me events
        </Button>
        <Link to="/feed" className="text-center text-brand-dark underline font-medium">
          Skip — just show me everything
        </Link>
      </div>
    </div>
  );
}

function ChoiceChip({ selected, onClick, children }: {
  selected: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={selected ? 'secondary' : 'ghost'}
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full ${selected ? 'border border-brand' : 'border border-black/10'}`}
    >
      {selected && <span aria-hidden>✓</span>}
      {children}
    </Button>
  );
}
