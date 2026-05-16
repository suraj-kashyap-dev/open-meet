export interface UserDto {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: string;
}

export interface UpdateProfileDto {
  name?: string;
  avatar?: string | null;
}
