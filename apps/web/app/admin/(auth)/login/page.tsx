import { Logo } from '@/components/shared/logo';
import { AdminLoginForm } from '@/features/admin-auth/components/admin-login-form';

export const metadata = {
  title: 'Admin sign in · Open Meet',
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Logo className="h-7 w-7" />
          <span>Open Meet</span>
        </div>

        <div className="space-y-6 rounded-2xl border border-border bg-card p-7 shadow-sm">
          <header className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Restricted area. Use your administrator credentials.
            </p>
          </header>

          <AdminLoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Looking for the user app?{' '}
          <a href="/" className="underline hover:text-foreground">
            Go to Open Meet
          </a>
        </p>
      </div>
    </main>
  );
}
