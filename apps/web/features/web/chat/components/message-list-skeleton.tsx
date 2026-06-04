import { cn } from '@open-meet/ui/cn';

const ROWS: { mine: boolean; width: string }[] = [
  { mine: false, width: 'w-40' },
  { mine: false, width: 'w-56' },
  { mine: true, width: 'w-48' },
  { mine: true, width: 'w-32' },
  { mine: false, width: 'w-60' },
  { mine: true, width: 'w-44' },
  { mine: false, width: 'w-36' },
  { mine: true, width: 'w-52' },
];

export function MessageListSkeleton() {
  return (
    <ul className="space-y-2 px-3 py-4">
      {ROWS.map((row, i) => (
        <li key={i} className={cn('flex', row.mine ? 'justify-end' : 'justify-start')}>
          <span
            className={cn(
              'shimmer h-9 max-w-[75%] rounded-2xl',
              row.width,
              row.mine ? 'rounded-ee-md' : 'rounded-es-md',
            )}
          />
        </li>
      ))}
    </ul>
  );
}
