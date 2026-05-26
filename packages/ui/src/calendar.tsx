'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import * as locales from 'react-day-picker/locale';

import { buttonVariants } from './button';
import { cn } from './cn';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const CALENDAR_LOCALES: Record<string, CalendarProps['locale']> = {
  en: locales.enUS,
  ar: locales.ar,
  bn: locales.bn,
  de: locales.de,
  es: locales.es,
  fr: locales.fr,
  hi: locales.hi,
  id: locales.id,
  it: locales.it,
  ja: locales.ja,
  ko: locales.ko,
  pt: locales.pt,
  ru: locales.ru,
  tr: locales.tr,
  zh: locales.zhCN,
};

export function getCalendarLocale(code: string): CalendarProps['locale'] {
  return CALENDAR_LOCALES[code] ?? locales.enUS;
}

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'relative flex flex-col gap-4 sm:flex-row',
        month: 'flex w-full flex-col gap-4',
        month_caption: 'flex h-9 items-center justify-center',
        caption_label: 'text-sm font-semibold tracking-tight',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between px-0.5',
        button_previous: cn(
          buttonVariants({ variant: 'outline', size: 'icon' }),
          'h-7 w-7 p-0 opacity-70 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline', size: 'icon' }),
          'h-7 w-7 p-0 opacity-70 hover:opacity-100',
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground',
        week: 'mt-1.5 flex w-full',
        day: cn(
          'relative h-9 w-9 p-0 text-center text-sm',
          '[&>button]:inline-flex [&>button]:h-9 [&>button]:w-9 [&>button]:cursor-pointer [&>button]:items-center [&>button]:justify-center [&>button]:rounded-md [&>button]:font-normal [&>button]:transition-colors',
          '[&>button:hover]:bg-muted',
          '[&>button:focus-visible]:outline-none [&>button:focus-visible]:ring-2 [&>button:focus-visible]:ring-accent',
        ),
        selected:
          '[&>button]:!bg-accent [&>button]:!text-accent-foreground [&>button]:font-semibold [&>button:hover]:!bg-accent [&>button:hover]:!text-accent-foreground',
        today: '[&>button]:bg-muted [&>button]:font-semibold [&>button]:text-foreground',
        outside: '[&>button]:text-muted-foreground/40',
        disabled: '[&>button]:pointer-events-none [&>button]:opacity-40',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === 'left' ? ChevronLeft : ChevronRight;
          return <Icon className="h-4 w-4" />;
        },
      }}
      {...props}
    />
  );
}

Calendar.displayName = 'Calendar';
