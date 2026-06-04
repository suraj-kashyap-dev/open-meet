import { MessageListSkeleton } from './message-list-skeleton';

export function ConversationViewSkeleton() {
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-background">
      <div className="flex min-h-[61px] items-center gap-3 border-b border-border px-4 py-3">
        <span className="shimmer -ms-1 h-8 w-8 shrink-0 rounded-md" />

        <div className="me-auto flex min-w-0 items-center gap-3">
          <span className="shimmer h-9 w-9 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="shimmer h-3.5 w-32 rounded" />
            <span className="shimmer h-2.5 w-20 rounded" />
          </div>
        </div>

        <span className="shimmer h-8 w-8 shrink-0 rounded-md" />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <MessageListSkeleton />
      </div>

      <div className="border-t border-border bg-card">
        <div className="flex items-end gap-2 px-3 py-3">
          <span className="shimmer h-9 w-9 shrink-0 rounded-md" />
          <span className="shimmer h-9 flex-1 rounded-md" />
          <span className="shimmer h-9 w-9 shrink-0 rounded-md" />
        </div>
      </div>
    </div>
  );
}
