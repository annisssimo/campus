export class UserResponseDto {
  id: string;
  email: string;
  createdAt: Date;
}

export class AuthResponseDto {
  accessToken: string;
  user: UserResponseDto;
}
