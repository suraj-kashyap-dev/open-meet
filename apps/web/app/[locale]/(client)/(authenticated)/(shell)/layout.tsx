import type { ReactNode } from 'react';

import { ShellFrame } from '@/components/web/shell/shell-frame';

export default function ShellLayout({ children }: { children: ReactNode }) {
  return <ShellFrame>{children}</ShellFrame>;
}
