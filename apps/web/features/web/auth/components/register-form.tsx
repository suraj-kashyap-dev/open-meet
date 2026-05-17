'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRegister } from '@/features/web/auth/hooks/use-auth';
import { ApiClientError } from '@/lib/api/client';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const register = useRegister();

  const {
    register: r,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await register.mutateAsync(values);
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Something went wrong';

      toast.error(message);
    }
  });

  const pending = isSubmitting || register.isPending;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" autoComplete="name" placeholder="Your name" {...r('name')} />
        {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...r('email')}
        />
        {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="new-password" {...r('password')} />
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        {pending ? 'Creating…' : 'Create account'}
      </Button>
    </form>
  );
}
