import { Types } from 'mongoose';

export interface IUser {
  _id?: Types.ObjectId;
  username: string;
  email: string;
  password: string;
  phoneNumber: string;
  profileUrl: string; //image url on cloud nary
  roles: string[]; //with array, you can do user.roles.push('')
  newEmail: string;
  isVerified: boolean;
  verifyEmailToken: string | null;
  resetPasswordToken: string | null;
  resetPasswordTokenExpiresAt: number | null;
}

export interface SignUpBody
  extends Pick<IUser, 'username' | 'email' | 'password'> {
  password: string; //eslint-no empty interface
}

export interface UpdateUserBody extends Partial<IUser> {
  newPassword: string;
}
