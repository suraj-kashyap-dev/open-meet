import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function MeetingEndedPage({ params }: Props) {
  const { code } = await params;

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-md items-center justify-center px-4 py-12">
      <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">You left the meeting</h1>
          <p className="text-sm text-muted-foreground">
            You can rejoin if it&apos;s still in progress, or head back to your dashboard.
          </p>
        </div>

        <Separator className="my-6" />

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Meeting code
          </span>
          <code className="rounded-md border border-border bg-muted px-2.5 py-1 font-mono text-sm">
            {code}
          </code>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="accent" size="lg" className="sm:flex-1">
            <Link href={`/meeting/${code}`}>Rejoin</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="sm:flex-1">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
