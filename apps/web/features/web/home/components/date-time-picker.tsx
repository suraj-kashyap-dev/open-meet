'use client';

import { CalendarClock, Clock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@open-meet/ui/button';
import { Calendar, getCalendarLocale } from '@open-meet/ui/calendar';
import { cn } from '@open-meet/ui/cn';
import { Popover, PopoverContent, PopoverTrigger } from '@open-meet/ui/popover';
import { ScrollArea } from '@open-meet/ui/scroll-area';

import {
  buildTimeSlots,
  isSameDay,
  isSlotInPast,
  isSlotSelected,
  mergeDateAndTime,
  startOfDay,
  type TimeSlot,
} from '@/features/web/home/lib/schedule-time';

const RTL_LOCALES = new Set(['ar']);

interface DateTimePickerProps {
  id?: string;
  value: Date;
  onChange: (value: Date) => void;
  minuteStep?: number;
}

export function DateTimePicker({ id, value, onChange, minuteStep = 30 }: DateTimePickerProps) {
  const t = useTranslations('home');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const selectedSlotRef = useRef<HTMLButtonElement>(null);

  const slots = useMemo(() => buildTimeSlots(minuteStep), [minuteStep]);
  const now = useMemo(() => new Date(), [open]);
  const dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(value),
    [locale, value],
  );

  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }),
    [locale],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      selectedSlotRef.current?.scrollIntoView({ block: 'center' });
    });

    return () => cancelAnimationFrame(frame);
  }, [open]);

  const onDateSelect = (date: Date | undefined) => {
    if (!date) {
      return;
    }

    onChange(mergeDateAndTime(date, { hour: value.getHours(), minute: value.getMinutes() }));
  };

  const onTimeSelect = (slot: TimeSlot) => {
    onChange(mergeDateAndTime(value, slot));
    setOpen(false);
  };

  const isToday = isSameDay(value, now);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="h-10 w-full justify-start gap-2.5 px-3 font-normal"
        >
          <CalendarClock className="h-4 w-4 shrink-0 text-accent" />
          <span className="truncate">{dateLabel}</span>
          <span className="mx-0.5 h-4 w-px shrink-0 bg-border" aria-hidden />
          <span className="tabular-nums">{timeFormatter.format(value)}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto overflow-hidden p-0" dir={dir}>
        <div className="flex max-sm:flex-col">
          <Calendar
            mode="single"
            selected={value}
            defaultMonth={value}
            onSelect={onDateSelect}
            disabled={{ before: startOfDay(now) }}
            locale={getCalendarLocale(locale)}
            dir={dir}
          />

          <div className="flex w-full flex-col border-border max-sm:border-t sm:w-44 sm:border-l">
            <div className="flex items-center gap-1.5 border-b border-border px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {t('schedule.time-heading')}
            </div>

            <ScrollArea className="h-56 sm:h-72">
              <div className="flex flex-col gap-1 p-2">
                {slots.map((slot) => {
                  const selected = isSlotSelected(value, slot);
                  const disabled = isToday && isSlotInPast(value, slot, now);

                  return (
                    <button
                      key={`${slot.hour}:${slot.minute}`}
                      ref={selected ? selectedSlotRef : undefined}
                      type="button"
                      disabled={disabled}
                      onClick={() => onTimeSelect(slot)}
                      className={cn(
                        'flex h-9 shrink-0 items-center justify-center rounded-md text-sm font-medium tabular-nums transition-colors',
                        'cursor-pointer hover:bg-muted',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                        'disabled:pointer-events-none disabled:opacity-40',
                        selected && 'bg-accent text-accent-foreground hover:bg-accent',
                      )}
                    >
                      {timeFormatter.format(mergeDateAndTime(value, slot))}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
