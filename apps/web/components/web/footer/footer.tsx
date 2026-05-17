import {
  ArrowUpRight,
  BookOpen,
  Github,
  Heart,
  LayoutGrid,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { GITHUB_URL } from '@/lib/constants';

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
    <footer className="relative isolate overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-1/2 -z-10 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-accent/5 blur-3xl"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 grid-backdrop opacity-30" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-14 sm:px-6 sm:py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-12">
          <div className="col-span-2 flex flex-col gap-6 md:col-span-5">
            <Link
              href="/"
              className="inline-flex w-fit items-center gap-2.5 text-base font-semibold tracking-tight"
            >
              <Logo className="h-9 w-9 shadow-sm" />

              <span className="text-lg">Open Meet</span>

              <span className="ml-1 inline-flex items-center rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                v0.1
              </span>
            </Link>

            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Open-source video conferencing for teams that move fast. Self-host in minutes, own
              your data forever.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button asChild size="sm">
                <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener" className="gap-1.5">
                  <Github className="h-3.5 w-3.5" />
                  Star on GitHub
                </a>
              </Button>

              <Button asChild size="sm" variant="outline">
                <a
                  href={`${GITHUB_URL}/issues`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="gap-1.5"
                >
                  Report an issue
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </Button>
            </div>

            <a
              href={`${GITHUB_URL}#status`}
              target="_blank"
              rel="noreferrer noopener"
              className="group mt-1 inline-flex w-fit items-center gap-2 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success transition-colors hover:border-success/50 hover:bg-success/15"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              All systems operational
              <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
          </div>

          <FooterCol className="md:col-span-2" eyebrow="Navigate" title="Product" icon={LayoutGrid}>
            <FooterLink href="/">Dashboard</FooterLink>
            <FooterLink href="/history">History</FooterLink>
            <FooterLink href="/account">Account</FooterLink>
          </FooterCol>

          <FooterCol
            className="md:col-span-2"
            eyebrow="Learn"
            title="Resources"
            icon={BookOpen}
          >
            <FooterLink href={`${GITHUB_URL}/blob/main/README.md`}>Self-host guide</FooterLink>
            <FooterLink href={`${GITHUB_URL}#api-reference`}>API reference</FooterLink>
            <FooterLink href={`${GITHUB_URL}/blob/main/LICENSE`}>MIT license</FooterLink>
            <FooterLink href={`${GITHUB_URL}/releases`}>Changelog</FooterLink>
          </FooterCol>

          <FooterCol className="md:col-span-3" eyebrow="Join in" title="Community" icon={Users}>
            <FooterLink href={GITHUB_URL}>GitHub repo</FooterLink>
            <FooterLink href={`${GITHUB_URL}/issues`}>Issues &amp; bug reports</FooterLink>
            <FooterLink href={`${GITHUB_URL}/discussions`}>Discussions</FooterLink>
            <FooterLink href={`${GITHUB_URL}/pulls`}>Contribute</FooterLink>
          </FooterCol>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/70 to-card/30 px-5 py-5 backdrop-blur sm:px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-accent/10 blur-3xl"
          />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/20">
                <Heart className="h-4 w-4" />
              </span>

              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Powered by
                </span>

                <span className="text-sm font-semibold tracking-tight">Built with open tech</span>
              </div>
            </div>

            <ul className="flex flex-wrap items-center gap-1.5">
              {STACK.map((tool) => (
                <li key={tool.name}>
                  <a
                    href={tool.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-background hover:text-foreground hover:shadow-sm"
                  >
                    {tool.name}
                    <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col-reverse items-start gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <span className="font-medium tracking-tight">
              © {new Date().getFullYear()} Open Meet
            </span>

            <span className="h-3 w-px bg-border" aria-hidden />

            <a
              href={`${GITHUB_URL}/blob/main/LICENSE`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              MIT
            </a>

            <span className="h-3 w-px bg-border" aria-hidden />

            <span className="inline-flex items-center gap-1.5">
              Crafted with
              <Heart className="h-3 w-3 fill-destructive text-destructive" aria-label="love" />
              by the community
            </span>
          </div>

          <a
            href={`${GITHUB_URL}/releases`}
            target="_blank"
            rel="noreferrer noopener"
            className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-foreground/30 hover:bg-card hover:text-foreground"
          >
            <Github className="h-3.5 w-3.5" />

            <span className="font-mono tracking-tight">v0.1.0</span>

            <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
        </div>
      </div>
    </footer>
  );
}

interface FooterColProps {
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  className?: string;
  children: React.ReactNode;
}

function FooterCol({ eyebrow, title, icon: Icon, className, children }: FooterColProps) {
  return (
    <div className={`flex flex-col gap-4 ${className ?? ''}`}>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border/60">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </span>
          <span className="text-sm font-semibold tracking-tight text-foreground">{title}</span>
        </div>
      </div>

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
