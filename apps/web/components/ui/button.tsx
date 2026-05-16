import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/shared/cn';

const buttonVariants = cva(
  [
    // base
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium',
    // transitions — keep snappy (100–150ms) so the press registers visually
    'transition-[transform,opacity,background-color,box-shadow,border-color] duration-150 ease-out',
    // focus
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    // press feedback — universal across variants. Scale-down + brightness on active.
    'active:scale-[0.97] active:brightness-95',
    // disabled
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:opacity-90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:opacity-90',
        outline:
          'border border-border bg-transparent hover:bg-muted hover:border-foreground/30',
        ghost: 'bg-transparent hover:bg-muted',
        accent:
          'bg-accent text-accent-foreground shadow-sm hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
