import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { User } from 'src/users/schemas/user.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BASE_URL}/api/auth/sso/google/callback`,
      scope: ['email', 'profile'],
    });
  }
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    //if no email, fail & redirect to login again//messages not shown tho
    const email = profile.emails?.[0]?.value;

    if (!email) {
      //to trigger failure redirect, err arg must be null and no user arg supplied
      //provide only one arg as null to trigger failure

      return done(null);
      //below will not trigger failure redirect//it will just return the the error object in empty page
      //it won't trigger success redirect since user arg is null too
      // return done(
      //   new Error(`Failed! Please choose a different way to sign in`)
      // );
    }

    try {
      //callbacks not supported in mongoose model interface
      const user = await this.userModel.findOne({ email });
      if (!user) {
        const newUser = new this.userModel({
          username: profile.displayName,
          email,
          isIsVerified: true,
        });

        newUser.save();

        return done(null, newUser);
      } else if (!user.isVerified) {
        //user has account bt not verified//registered using form
        return done(null);
      } else {
        return done(null, user);
      }
    } catch (error) {
      return done(null);
    }
  }
}
