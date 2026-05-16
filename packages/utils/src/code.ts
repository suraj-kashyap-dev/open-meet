const JOIN_CODE_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
const JOIN_CODE_LENGTH = 12;

export function generateMeetingCode(
  randomBytes: (n: number) => Uint8Array,
): string {
  const bytes = randomBytes(JOIN_CODE_LENGTH);
  let out = '';
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    const byte = bytes[i] ?? 0;
    out += JOIN_CODE_ALPHABET[byte % JOIN_CODE_ALPHABET.length];
  }
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}

const JOIN_CODE_REGEX = /^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/;

export function isValidMeetingCode(code: string): boolean {
  return JOIN_CODE_REGEX.test(code);
}

export function normalizeMeetingCode(code: string): string {
  return code.trim().toLowerCase();
}
