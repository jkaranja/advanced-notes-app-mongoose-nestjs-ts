import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, now } from 'mongoose';

//Schemas can be created with NestJS decorators, or with Mongoose itself manually.
//Using decorators to create schemas greatly reduces boilerplate and improves overall code readability.

export type UserDocument = HydratedDocument<User>;

@Schema() //decorator marks a class as a schema definition.//maps class to db collection of same name + s= users
export class User {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  email: string;

  @Prop()
  password: string;

  @Prop()
  phoneNumber: string;

  @Prop()
  profileUrl: string;

  @Prop({ type: [String], default: ['admin'] })
  roles: string[]; //arr of strings

  @Prop()
  newEmail: string;

  @Prop({ type: Boolean, default: false }) //for arrays & objects, type must be provided i.e using mongoose SchemaTypes
  isVerified: boolean;

  @Prop()
  verifyEmailToken: string;

  @Prop()
  resetPasswordToken: string;

  @Prop()
  resetPasswordTokenExpiresAt: number;

  @Prop({ default: now() }) //now from mongoose = Date.now()
  createdAt: Date;

  @Prop({ default: now() })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
