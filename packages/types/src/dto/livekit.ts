export interface LiveKitTokenRequestDto {
  meetingCode: string;
}

export interface LiveKitTokenResponseDto {
  token: string;
  url: string;
  identity: string;
  room: string;
}
