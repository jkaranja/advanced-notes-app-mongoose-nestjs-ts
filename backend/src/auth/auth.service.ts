import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { endOfDay, startOfDay } from 'date-fns';
import * as bcrypt from 'bcrypt';
import { JwtPayload, VerifyErrors } from 'jsonwebtoken';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Response, Request } from 'express';
import { User } from 'src/users/schemas/user.schema';
import mongoose, { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import sendEmail from 'src/util/sendEmail';

@Injectable()
export class AuthService {
  //inject a user model into the usersService using the @InjectModel() decorator:
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}
  //HOW IT WILL WORK
  //we send refresh token as cookie that can't be read by js//it will be used to send a new access token if it has expired
  //on login, we will get a short lived  access token and store in state .ie redux store//it will be lost when we close browser//stored in RAM
  //cookies/local stored etc are stored in cache that can be accessed by js unless otherwise
  //the access token will be sent in every request and we will verify it
  //if it fails with 403 when access token has expired, request new access token using refresh token
  //once you get the token, send request again

  /*-----------------------------------------------------------
 * LOGIN
 ------------------------------------------------------------*/
  /**
   * @desc - Login
   * @access - Public
   */
  login = async (loginBody: any, res: Response) => {
    const { email, password } = loginBody;

    if (!email || !password) {
      throw new BadRequestException('All fields are required');
    }

    const foundUser = await this.userModel.findOne({ email }).exec();

    if (!foundUser) {
      throw new BadRequestException('Wrong email or password');
    }

    if (!foundUser.isVerified) {
      throw new BadRequestException(
        'Please verify your email first. We sent a link to your email',
      );
    }

    const match = await bcrypt.compare(password, foundUser.password);

    if (!match) {
      throw new BadRequestException('Wrong email or password');
    }

    //sign access token//payload = user id
    const accessToken = jwt.sign(
      {
        id: foundUser._id,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '35m' }, //expires in 35min//change later to 15
    );

    //sign refresh token
    const refreshToken = jwt.sign(
      { id: foundUser._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '31d' }, //expires in 31 days
    );

    // Create secure cookie with refresh token as value
    const day = 24 * 60 * 60 * 1000;
    res.cookie('jwt', refreshToken, {
      httpOnly: true, //can't be accessed by client script via document.cookie//only server//xss won't be able to req new access token if current is stolen
      secure: true, //allow only https//in dev, remove secure part in postman cookie manager//cors handle browser req with credentials=true
      sameSite: 'none', //'none' | boolean | 'strict' | 'lax' //cross-site cookie//allow//for csrf, it won't happen since all requests needs an access token too
      maxAge: 31 * day, //31 days//cookie expiry set to match refreshToken
    });

    // Send accessToken containing user id
    return { accessToken };
  };

  // /*-------------------------------------------------------
  //  * SSO SUCCESSFUL
  //  --------------------------------------------------------*/
  /**
   * @desc - single sign-on
   * @access - Public
   */

  authRedirect = (req: Request, res: Response) => {
    //only need this when using passport that defines type for req.user as User which empty
    //somehow, this req from passport above is being intercepted by passport and overriding our req.user type declared using module argumentation
    //for other req objects, our User in declare is able to override passport empty User interface
    interface User {
      _id: mongoose.Types.ObjectId;
    }

    if (!req.user) {
      //return 'No user from google';//redirect to failed
      res.redirect(process.env.OAUTH_FAILURE_REDIRECT_URL);
    }

    const { _id: id } = req.user as User;

    const refreshToken = jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: '31d',
    });

    // Create secure cookie with refresh token
    const day = 24 * 60 * 60 * 1000;
    res.cookie('jwt', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 31 * day, // cookie expiry set to match refreshToken
    });

    // Successful authentication, redirect to account.
    //cookie will be set in the browser after redirect// add query parameter to call /refresh route to get access token for this user
    //send encrypted refresh token as query parameter//on frontend//get the token and send it
    res.redirect(
      `${process.env.OAUTH_SUCCESS_REDIRECT_URL}/?authenticated=true`,
    );
  };

  // /*--------------------------------------------------------
  //  * CONFIRM EMAIL
  //  ---------------------------------------------------------*/

  /**
   * @desc - verify
   * @access - Public
   */

  verifyEmail = async (verifyToken: any) => {
    const verifyEmailToken = crypto
      .createHash('sha256')
      .update(verifyToken)
      .digest('hex');

    const foundUser = await this.userModel.findOne({
      verifyEmailToken,
    });

    if (!foundUser) {
      throw new BadRequestException(
        'Email could not be verified. Please contact support',
      );
    }

    foundUser.isVerified = true;

    foundUser.verifyEmailToken = null; //invalidate token after successful verification

    //if changing email
    if (foundUser.newEmail) {
      foundUser.email = foundUser.newEmail;
      foundUser.newEmail = ''; //clear new email field
    }

    await foundUser.save();
    return { message: 'Email verified' };
  };

  // /*--------------------------------------------------------
  //  * FORGOT PASSWORD
  //  ---------------------------------------------------------*/

  /**
   * @desc - forgot password
   * @access - Public
   */

  forgotPassword = async (email: any) => {
    if (!email) {
      throw new BadRequestException('Email required');
    }

    const foundUser = await this.userModel.findOne({ email }).exec();

    if (!foundUser) {
      throw new BadRequestException('Email could not be sent');
    }

    //will give as 20 characters//hex is 16 numbers 0-9 then a-f
    const resetToken = crypto.randomBytes(20).toString('hex');

    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    foundUser.resetPasswordToken = resetPasswordToken;

    foundUser.resetPasswordTokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000; //expire in 24 hrs

    //send email//then use match.params.resetToken to get the token
    const emailOptions = {
      subject: 'Reset your password',
      to: foundUser.email,
      body: `
                  <p>Hi ${foundUser.username}, </p>
                  <p>A request to reset your password has been made. If you did not make this request, ignore this email. If you did make the request, please click the button below to reset your password:</p>
                  <a href ='${process.env.RESET_PWD_URL}/${resetToken}' target='_blank' style='display: inline-block; color: #ffffff; background-color: #3498db; border: solid 1px #3498db; border-radius: 5px; box-sizing: border-box; cursor: pointer; text-decoration: none; font-size: 14px; font-weight: bold; margin: 15px 0px; padding: 5px 15px; text-transform: capitalize; border-color: #3498db;'>Reset password
                  </a>
                  <p><small>This link will expire in 24 hours</small> </p>
                  `,
    };
    const response = sendEmail(emailOptions);

    if (!response) {
      throw new BadRequestException('Email could not be sent');
    }

    await foundUser.save();

    return { message: "We've sent a password recovery link to your email" };
  };

  // /*--------------------------------------------------------
  //  * RESET PASSWORD
  //  ---------------------------------------------------------*/

  /**
   * @desc - Reset
   * @access - Public
   */

  resetPassword = async (resetToken: string, password: string) => {
    if (!password) {
      throw new BadRequestException('Password is required');
    }

    const token = crypto.createHash('sha256').update(resetToken).digest('hex');

    // const user = await User.findOne({
    //   resetPasswordToken: { token, expiresIn: { $gt: Date.now() } },
    // });

    const foundUser = await this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordTokenExpiresAt: { $gt: Date.now() },
    });

    if (!foundUser) {
      throw new BadRequestException('Password could not be reset');
    }

    foundUser.resetPasswordToken = null;

    foundUser.password = await bcrypt.hash(password, 10);

    await foundUser.save();
    return {
      message: 'Password reset successfully. Please log in',
    };
  };

  // /*--------------------------------------------------------
  //  * REFRESH TOKEN//GET NEW ACCESS TOKEN
  //  ---------------------------------------------------------*/
  /**
   * @desc - Refresh
   * @access - Public
   */

  refresh = async (req: Request) => {
    const cookies = req.cookies;

    if (!cookies?.jwt) throw new ForbiddenException('Forbidden');

    const refreshToken: string = cookies.jwt; //cookies.jwt is of any type//must be converted to string for err & decoded types to be inferred
    //else you must pass type: err: VerifyErrors | null,  decoded: JwtPayload | string | undefined

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const foundUser = await this.userModel
      .findById((<{ id: string }>decoded).id)
      .exec();

    if (!foundUser) {
      throw new ForbiddenException('Forbidden');
    }

    try {
      const accessToken = jwt.sign(
        {
          id: foundUser._id,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '15m' },
      );

      return { accessToken };
    } catch (error) {
      //throw custom error//at this point, user must login again to get a valid refresh token
      throw new ForbiddenException(`Your session has expired. Please log in`);
    }
  };

  // /*--------------------------------------------------------
  //  * LOGOUT//CLEAR REFRESH TOKEN COOKIE
  //  ---------------------------------------------------------*/

  /**
   * @desc - Logout
   * @access - Public
   *
   */
  logout = (req: Request, res: Response) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) {
      return { message: 'Logged out' };
    }
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'none', secure: true });
    return { message: 'Logged out' };
  };
}
