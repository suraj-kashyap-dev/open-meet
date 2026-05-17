import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/cn';

export type UserAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';

const SIZE: Record<UserAvatarSize, string> = {
  xs: 'h-6 w-6',
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
  xl: 'h-11 w-11',
  '2xl': 'h-14 w-14',
  '3xl': 'h-16 w-16',
  '4xl': 'h-20 w-20',
};

const FALLBACK_TEXT: Record<UserAvatarSize, string> = {
  xs: 'text-[10px]',
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-xs',
  xl: 'text-sm',
  '2xl': 'text-base',
  '3xl': 'text-lg',
  '4xl': 'text-xl',
};

interface UserAvatarProps {
  user: { name: string; avatar?: string | null };
  size?: UserAvatarSize;
  className?: string;
  fallbackClassName?: string;
  title?: string;
}

export function UserAvatar({
  user,
  size = 'md',
  className,
  fallbackClassName,
  title,
}: UserAvatarProps) {
  return (
    <Avatar className={cn(SIZE[size], className)} title={title}>
      {user.avatar ? <AvatarImage src={user.avatar} alt={user.name} /> : null}

      <AvatarFallback
        className={cn(
          'bg-accent/15 font-semibold text-accent',
          FALLBACK_TEXT[size],
          fallbackClassName,
        )}
      >
        {initialsOf(user.name)}
      </AvatarFallback>
    </Avatar>
  );
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
