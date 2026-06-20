import { cn } from '@open-meet/ui/cn';

const ROWS: { mine: boolean; lines: 1 | 2; width: string }[] = [
  { mine: false, lines: 1, width: 'w-40' },
  { mine: false, lines: 2, width: 'w-56' },
  { mine: true, lines: 1, width: 'w-48' },
  { mine: true, lines: 2, width: 'w-36' },
  { mine: false, lines: 1, width: 'w-60' },
  { mine: true, lines: 1, width: 'w-44' },
  { mine: false, lines: 2, width: 'w-52' },
  { mine: true, lines: 1, width: 'w-32' },
];

export function MessageListSkeleton() {
  return (
    <ul className="space-y-3 px-3 py-4">
      {ROWS.map((row, i) => (
        <li
          key={i}
          className={cn('flex items-end gap-2', row.mine ? 'justify-end' : 'justify-start')}
        >
          {!row.mine ? <span className="shimmer h-8 w-8 shrink-0 rounded-full" /> : null}
          <span
            className={cn(
              'shimmer max-w-[75%] rounded-2xl',
              row.width,
              row.lines === 2 ? 'h-14' : 'h-9',
              row.mine ? 'rounded-ee-md' : 'rounded-es-md',
            )}
          />
        </li>
      ))}
    </ul>
  );
}
