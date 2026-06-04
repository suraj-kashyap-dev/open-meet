import { Fragment } from 'react';

export function ConversationListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <Fragment>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="group relative flex items-center rounded-2xl border border-transparent"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5">
            <div className="relative shrink-0">
              <span className="shimmer block h-9 w-9 rounded-full" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="shimmer h-3.5 w-1/2 rounded" />
                <span className="shimmer h-2.5 w-8 shrink-0 rounded" />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="shimmer h-3 w-2/3 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </Fragment>
  );
}
