export interface IcsEvent {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  organizerEmail: string;
  organizerName?: string;
  attendees?: string[];
  rrule?: string | null;
}

const PROD_ID = '-//open-meet//EN';

export function buildIcs(event: IcsEvent): string {
  const now = new Date();

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PROD_ID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${escapeText(event.uid)}`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART:${formatUtc(event.start)}`,
    `DTEND:${formatUtc(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeText(event.location)}`);
  }

  if (event.rrule) {
    lines.push(`RRULE:${event.rrule}`);
  }

  const organizerCn = event.organizerName ? `CN=${escapeText(event.organizerName)}:` : '';
  lines.push(`ORGANIZER;${organizerCn}mailto:${event.organizerEmail}`);

  for (const email of event.attendees ?? []) {
    lines.push(
      `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${email}`,
    );
  }

  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.map(foldLine).join('\r\n') + '\r\n';
}

function formatUtc(d: Date): string {
  const pad = (n: number): string => n.toString().padStart(2, '0');

  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function escapeText(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function foldLine(line: string): string {
  if (line.length <= 75) {
    return line;
  }

  const chunks: string[] = [];
  let i = 0;

  while (i < line.length) {
    const size = i === 0 ? 75 : 74;
    const chunk = line.slice(i, i + size);
    chunks.push(i === 0 ? chunk : ' ' + chunk);
    i += size;
  }

  return chunks.join('\r\n');
}
