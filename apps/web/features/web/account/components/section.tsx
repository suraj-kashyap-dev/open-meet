import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="border-b border-border px-6 py-4">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>

        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </header>

      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="flex flex-col gap-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {eyebrow}
      </p>

      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>

      <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
    </header>
  );
}
