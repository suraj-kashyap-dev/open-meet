export interface TimeSlot {
  hour: number;
  minute: number;
}

/** Every slot of the day at a fixed minute step, from 00:00 up to (but not including) 24:00. */
export function buildTimeSlots(stepMinutes = 30): TimeSlot[] {
  if (stepMinutes <= 0 || stepMinutes > 24 * 60) {
    throw new Error('stepMinutes must be between 1 and 1440');
  }

  const slots: TimeSlot[] = [];

  for (let m = 0; m < 24 * 60; m += stepMinutes) {
    slots.push({ hour: Math.floor(m / 60), minute: m % 60 });
  }

  return slots;
}

/** Returns a new Date on the same calendar day as `date` but at the given time. */
export function mergeDateAndTime(date: Date, slot: TimeSlot): Date {
  const next = new Date(date);
  next.setHours(slot.hour, slot.minute, 0, 0);
  return next;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

/** A slot is in the past when, placed on `date`, it falls before `now`. */
export function isSlotInPast(date: Date, slot: TimeSlot, now: Date): boolean {
  return mergeDateAndTime(date, slot).getTime() < now.getTime();
}

export function isSlotSelected(value: Date, slot: TimeSlot): boolean {
  return value.getHours() === slot.hour && value.getMinutes() === slot.minute;
}

/** The next whole hour from `from` (minutes/seconds zeroed), e.g. 14:23 → 15:00. */
export function nextRoundedHour(from: Date = new Date()): Date {
  const next = new Date(from);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}
