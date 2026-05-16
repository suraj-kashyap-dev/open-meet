import Link from 'next/link';
import { Video } from 'lucide-react';

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
              open-meet
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

          <FooterCol title="Resources">
            <FooterLink href="#why">Why open-meet</FooterLink>
            <FooterLink href="http://localhost:3001/api/docs">API docs</FooterLink>
            <FooterLink href="https://github.com">GitHub</FooterLink>
          </FooterCol>
        </div>

        <div className="flex flex-col items-start justify-between gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} open-meet · MIT licensed</span>
          <span>Built with Next.js, NestJS, and LiveKit</span>
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
  return (
    <Link
      href={href}
      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </Link>
  );
}
