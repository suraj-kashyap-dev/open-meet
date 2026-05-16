import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function MeetingEndedPage({ params }: Props) {
  const { code } = await params;
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">You&apos;ve left the meeting</h1>
      <p className="text-muted-foreground">
        Meeting <span className="font-mono text-foreground">{code}</span> has ended for you.
      </p>
      <div className="flex gap-3">
        <Button asChild variant="accent">
          <Link href="/">Return home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/meeting/${code}/lobby`}>Rejoin</Link>
        </Button>
      </div>
    </main>
  );
}
