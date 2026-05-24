import { Construction } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
  label: string;
}

export function ComingSoon({ title, description, label }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Construction className="h-6 w-6" />
      </span>

      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>

      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}

      <span className="mt-4 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
