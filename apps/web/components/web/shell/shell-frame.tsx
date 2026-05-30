import type { ReactNode } from 'react';

import { IconRail } from './icon-rail';
import { TopBar } from './top-bar';

export function ShellFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <IconRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
