interface ParticipantMetadata {
  avatar: string | null;
}

export function parseParticipantMetadata(raw: string | undefined): ParticipantMetadata {
  if (!raw) {
    return { avatar: null };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ParticipantMetadata>;

    return { avatar: parsed.avatar ?? null };
  } catch {
    return { avatar: null };
  }
}
