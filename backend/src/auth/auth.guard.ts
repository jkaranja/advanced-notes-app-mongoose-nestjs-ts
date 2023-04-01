import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common/exceptions';
import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { Model } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';

//guards implements the CanActivate interface
//Guards determine whether a given request will be handled by the route handler or not, depending on certain conditions
//This is often referred to as authorization.
//instead of using middleware like in express for auth, we use guards in nestjs
//middleware, by its nature, is dumb. It doesn't know which handler will be executed after calling the next() function. On the other hand, Guards have access to the ExecutionContext instance, and thus know exactly what's going to be executed next.

//The AuthGuard that we'll build now assumes an authenticated user (and that, therefore, a token is attached to the request headers). It will extract and validate the token, and use the extracted information to determine whether the request can proceed or not.
@Injectable()
export class AuthGuard implements CanActivate {
  //inject a user model into the usersService using the @InjectModel() decorator:
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const token = this.extractTokenFromHeader(req);
    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      //executed synchronously if no callback
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      const user = await this.userModel
        .findById((<{ id: string }>decoded).id)
        .select('-password')
        .lean()
        .exec();
      //null or user
      req.user = user;
    } catch (error) {
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractTokenFromHeader(req: Request): string | undefined {
    const authHeader =
      (req.headers.authorization as string) ||
      (req.headers.Authorization as string);

    const [type, token] = authHeader?.split(' ') ?? [];

    return authHeader?.startsWith('Bearer ') && type === 'Bearer'
      ? token
      : undefined;
  }
}
