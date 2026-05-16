import { Github, Video } from 'lucide-react';
import Link from 'next/link';

import { GITHUB_URL } from '@/lib/shared/constants';

export function Footer() {
  return (
    <footer className="bg-background py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
                <Video className="h-4 w-4" aria-hidden />
              </span>
              Open Meet
            </Link>

            <p className="max-w-xs text-sm text-muted-foreground">
              Open-source video conferencing for teams that move fast.
            </p>
          </div>

          <FooterCol title="Product">
            <FooterLink href="/register">Get started</FooterLink>
            <FooterLink href="/login">Sign in</FooterLink>
            <FooterLink href="#features">Features</FooterLink>
            <FooterLink href="#how">How it works</FooterLink>
          </FooterCol>

          <FooterCol title="Open source">
            <FooterLink href={GITHUB_URL}>GitHub repo</FooterLink>
            <FooterLink href={`${GITHUB_URL}/blob/main/LICENSE`}>MIT license</FooterLink>
            <FooterLink href={`${GITHUB_URL}/issues`}>Issues</FooterLink>
            <FooterLink href={`${GITHUB_URL}/blob/main/README.md`}>Self-host guide</FooterLink>
          </FooterCol>
        </div>

        <div className="flex flex-col items-start justify-between gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} open-meet · MIT licensed · Built with Next.js, NestJS &amp; LiveKit</span>

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Github className="h-3.5 w-3.5" />
            Star us on GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-medium uppercase tracking-widest text-foreground">{title}</span>
      <div className="flex flex-col gap-2">{children}</div>
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
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </Link>
  );
}
