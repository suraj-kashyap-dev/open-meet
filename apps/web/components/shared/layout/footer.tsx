import { ArrowUpRight, Github, Heart } from 'lucide-react';
import Link from 'next/link';

import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { GITHUB_URL } from '@/lib/shared/constants';

const STACK = [
  { name: 'Next.js 15', href: 'https://nextjs.org' },
  { name: 'NestJS 11', href: 'https://nestjs.com' },
  { name: 'LiveKit', href: 'https://livekit.io' },
  { name: 'PostgreSQL', href: 'https://www.postgresql.org' },
  { name: 'Redis', href: 'https://redis.io' },
  { name: 'Tailwind v4', href: 'https://tailwindcss.com' },
];

export function Footer() {
  return (
    <footer className="relative bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-14 sm:px-6 sm:py-16">

        <div className="grid grid-cols-2 gap-10 md:grid-cols-12">

          <div className="col-span-2 flex flex-col gap-5 md:col-span-5">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-base font-semibold tracking-tight"
            >
              <Logo className="h-8 w-8 shadow-sm" />
              <span>Open Meet</span>
            </Link>

            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Open-source video conferencing for teams that move fast. Self-host
              in minutes, own your data forever.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button asChild size="sm" variant="outline">
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="gap-1.5"
                >
                  <Github className="h-3.5 w-3.5" />
                  Star on GitHub
                </a>
              </Button>
            </div>
          </div>

          <FooterCol className="md:col-span-2" title="Product">
            <FooterLink href="/">Dashboard</FooterLink>
            <FooterLink href="/history">History</FooterLink>
            <FooterLink href="/account">Account</FooterLink>
          </FooterCol>

          <FooterCol className="md:col-span-2" title="Resources">
            <FooterLink href={`${GITHUB_URL}/blob/main/README.md`}>
              Self-host guide
            </FooterLink>
            <FooterLink href={`${GITHUB_URL}#api-reference`}>
              API reference
            </FooterLink>
            <FooterLink href={`${GITHUB_URL}/blob/main/LICENSE`}>
              MIT license
            </FooterLink>
            <FooterLink href={`${GITHUB_URL}/releases`}>Changelog</FooterLink>
          </FooterCol>

          <FooterCol className="md:col-span-3" title="Community">
            <FooterLink href={GITHUB_URL}>GitHub repo</FooterLink>
            <FooterLink href={`${GITHUB_URL}/issues`}>
              Issues &amp; bug reports
            </FooterLink>
            <FooterLink href={`${GITHUB_URL}/discussions`}>
              Discussions
            </FooterLink>
            <FooterLink href={`${GITHUB_URL}/pulls`}>Contribute</FooterLink>
          </FooterCol>

        </div>

        <div className="flex flex-col gap-3 border-t border-border/60 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Built with
          </span>

          <ul className="flex flex-wrap items-center gap-1.5">
            {STACK.map((tool) => (
              <li key={tool.name}>
                <a
                  href={tool.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  {tool.name}
                  <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col-reverse items-start gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} Open Meet</span>

            <span className="text-border" aria-hidden>·</span>

            <a
              href={`${GITHUB_URL}/blob/main/LICENSE`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 font-medium transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              MIT
            </a>

            <span className="text-border" aria-hidden>·</span>

            <span className="inline-flex items-center gap-1.5">
              Crafted with
              <Heart
                className="h-3 w-3 fill-destructive text-destructive"
                aria-label="love"
              />
              by the community
            </span>
          </div>

          <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            All systems operational
          </span>
        </div>

      </div>
    </footer>
  );
}

interface FooterColProps {
  title: string;
  className?: string;
  children: React.ReactNode;
}

function FooterCol({ title, className, children }: FooterColProps) {
  return (
    <div className={`flex flex-col gap-3 ${className ?? ''}`}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
        {title}
      </span>

      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const isExternal = href.startsWith('http');

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="group inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {children}
        <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
      </a>
    );
  }

  return (
    <Link
      href={href}
      className="w-fit text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </Link>
  );
}
