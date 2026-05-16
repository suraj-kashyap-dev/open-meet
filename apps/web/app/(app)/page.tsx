import { HomeActions } from '@/components/home/home-actions';

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-12 px-4 py-16">
      <section className="space-y-3 text-center">
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Talk face-to-face.
        </h1>
        <p className="text-balance text-muted-foreground sm:text-lg">
          Start a meeting in one click or join with a code. No download required.
        </p>
      </section>
      <HomeActions />
    </main>
  );
}
