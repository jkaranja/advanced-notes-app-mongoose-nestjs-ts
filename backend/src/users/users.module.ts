import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from './schemas/user.schema';
import { CloudinaryModule } from 'src/cloudnary/cloudinary.module';

@Module({
  //register the models in the current scope//i.e let nest js know the model(s) exists
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    CloudinaryModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ], //export model so any module importing this UserModule will have access to it
})
export class UsersModule {}
