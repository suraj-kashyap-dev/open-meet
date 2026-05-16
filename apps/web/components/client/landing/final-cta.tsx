import { Github } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { GITHUB_URL } from '@/lib/shared/constants';

import { GetStartedButton } from './get-started-button';

interface Props {
  initialSession?: boolean;
}

export function FinalCta({ initialSession = false }: Props) {
  return (
    <section className="relative overflow-hidden border-b border-border/40 py-24 sm:py-32">
      <div className="grid-backdrop pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className="spotlight pointer-events-none absolute inset-0 -z-10" aria-hidden />

      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 text-center sm:px-6">
        <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Open source video.{' '}
          <span className="gradient-text">On your terms.</span>
        </h2>

        <p className="max-w-xl text-balance text-muted-foreground">
          Spin up a room in one click — or clone the repo and run the whole stack yourself.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <GetStartedButton initialSession={initialSession} className="px-8" />

          <Button asChild variant="outline" size="lg">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener">
              <Github className="h-4 w-4" />
              Star on GitHub
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
