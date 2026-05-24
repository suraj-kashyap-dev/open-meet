import { ComingSoon } from '@/components/coming-soon';

export const metadata = {
  title: 'Configuration · Open Meet Admin',
};

export default function ConfigurationPage() {
  return (
    <main className="w-full space-y-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Settings
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Workspace defaults, branding, and meeting policies.
        </p>
      </header>

      <ComingSoon
        title="Configuration is on the way"
        description="Workspace defaults, branding, and meeting policies will live here soon."
      />
    </main>
  );
}
