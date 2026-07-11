import { Card } from './ui';

// Temporary scaffold placeholder. Each contributor REPLACES the body of
// their feature page(s). Keeps the app runnable end-to-end from day 0.
export function Placeholder({ owner, doc, title, children }: {
  owner: string; doc: string; title: string; children?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed">
      <p className="text-xs uppercase tracking-wide text-muted">{owner}</p>
      <h1 className="text-xl font-bold text-brand-dark mt-1">{title}</h1>
      <p className="text-muted mt-2">
        Scaffold placeholder. Implement per <code>docs/{doc}</code>.
      </p>
      {children && <div className="mt-3 text-sm">{children}</div>}
    </Card>
  );
}
