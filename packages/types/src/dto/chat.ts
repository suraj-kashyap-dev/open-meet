export interface MessageSenderDto {
  id: string;
  name: string;
  avatar: string | null;
}

export interface MessageDto {
  id: string;
  meetingId: string;
  content: string;
  sender: MessageSenderDto;
  sentAt: string;
}

export interface SendMessageDto {
  meetingCode: string;
  content: string;
}
