import { describe, expect, it } from 'vitest';

import { buildIcs } from '../src/ics';

const base = {
  uid: 'evt-1',
  title: 'Standup',
  start: new Date('2026-06-01T10:30:00Z'),
  end: new Date('2026-06-01T11:00:00Z'),
  organizerEmail: 'host@x.com',
};

describe('buildIcs()', () => {
  it('should emit a VCALENDAR/VEVENT with UTC timestamps and CRLF line endings', () => {
    const ics = buildIcs(base);

    expect(ics).toContain('BEGIN:VCALENDAR');

    expect(ics).toContain('BEGIN:VEVENT');

    expect(ics).toContain('UID:evt-1');

    expect(ics).toContain('DTSTART:20260601T103000Z');

    expect(ics).toContain('DTEND:20260601T110000Z');

    expect(ics).toContain('SUMMARY:Standup');

    expect(ics).toContain('ORGANIZER;mailto:host@x.com');

    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);

    expect(ics).toContain('\r\n');
  });

  it('should escape special characters in text fields', () => {
    const ics = buildIcs({ ...base, title: 'A, B; C' });

    expect(ics).toContain('SUMMARY:A\\, B\\; C');
  });

  it('should include RRULE and ATTENDEE lines when provided', () => {
    const ics = buildIcs({ ...base, rrule: 'FREQ=WEEKLY', attendees: ['a@x.com', 'b@x.com'] });

    expect(ics).toContain('RRULE:FREQ=WEEKLY');

    expect(ics).toContain('mailto:a@x.com');

    expect(ics).toContain('mailto:b@x.com');
  });

  it('should fold lines longer than 75 octets with a CRLF + space continuation', () => {
    const ics = buildIcs({ ...base, description: 'x'.repeat(200) });

    expect(ics).toContain('\r\n ');
  });
});
