export function TrustStrip() {
  const logos = ['Linear', 'Vercel', 'Resend', 'Sentry', 'Stripe', 'Supabase'];

  return (
    <section className="border-y border-border/60 bg-card/30 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
          Trusted by engineering teams everywhere
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
          {logos.map((logo) => (
            <span
              key={logo}
              className="text-lg font-medium tracking-tight text-muted-foreground"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
