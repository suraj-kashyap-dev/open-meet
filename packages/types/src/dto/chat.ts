export interface MessageSenderDto {
  id: string;
  name: string;
  avatar: string | null;
}

export interface AttachmentDto {
  id: string;
  url: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
}

export interface MessageDto {
  id: string;
  meetingId: string;
  content: string;
  sender: MessageSenderDto;
  sentAt: string;
  attachments: AttachmentDto[];
}

export interface SendMessageDto {
  meetingCode: string;
  content: string;
  attachmentIds?: string[];
}

export interface MessagePageDto {
  items: MessageDto[];
  nextCursor: string | null;
}
