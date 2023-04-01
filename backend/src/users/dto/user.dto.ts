//DTO (Data Transfer Object) schema. A DTO is an object that defines how the data will be sent over the network.

export class SignUpDto {
  username: string;
  email: string;
  password: string;
}

export class UpdateUserDto extends SignUpDto {
  phoneNumber: string;
  newPassword: string;
  profileUrl: string;
}
