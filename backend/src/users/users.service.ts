import { Injectable } from '@nestjs/common';
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common/exceptions';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Response, Request } from 'express';
import * as jwt from 'jsonwebtoken';
import mongoose, { Model } from 'mongoose';
import sendEmail from 'src/util/sendEmail';
import { IUser, SignUpBody, UpdateUserBody } from './interfaces/user.interface';
import { User } from './schemas/user.schema';
import { CloudinaryService } from 'src/cloudnary/cloudinary.service';

//Providers are plain JavaScript classes that are declared as providers in a module.
//Services are providers. This service will be responsible for data storage and retrieval, and is designed to be used by the Controller
export interface SignUpArgs {
  username?: string;
  email?: string;
  password?: string;
}

@Injectable()
export class UsersService {
  //inject a user model into the usersService using the @InjectModel() decorator:
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private cloudinary: CloudinaryService,
  ) {}
  /*-----------------------------------------------------------
 * GET USER
 ------------------------------------------------------------*/

  getUser = async (req: Request) => {
    // optionally block the user
    // we could also check user roles/permissions here
    //user from contextValue param above
    // throwing a `GraphQLBadRequestException` here allows us to specify an HTTP status code,
    // badRequestExceptions in graphql server initialization/schema validation/context code is 500
    //resolvers badRequestExceptions return 200 OK badRequestExceptions or success
    // if (!user) {
    //    throw customGraphqlBadRequestException({ code: "UNAUTHORIZED" });
    // }
    const { user } = req as any;
    return {
      id: user._id,
      username: user.username,
      email: user.email,
      profileUrl: user.profileUrl,
      phoneNumber: user.phoneNumber,
      newEmail: user.newEmail,
    };
  };
  /*-----------------------------------------------------------
 * REGISTER
 ------------------------------------------------------------*/
  /**
   * @desc - Create new user
   * @access - Public
   *
   */
  registerUser = async (registerDto: SignUpBody, res: Response) => {
    const { username, password, email } = registerDto;

    // Confirm data
    if (!username || !email || !password) {
      throw new BadRequestException('All fields are required');
    }

    // Check for duplicate username || email
    //collation strength 2 makes username or email sent by user case insensitive i.e it should
    //match both lowercase and uppercase to ensure no same email is added in diff cases
    const duplicate = await this.userModel
      .findOne({ email })

      .collation({ locale: 'en', strength: 2 })
      .lean()
      .exec();

    if (duplicate) {
      throw new BadRequestException('Account already exists. Please log in');
    }

    // Hash password//auto gen salt  & hash
    const hashedPwd = await bcrypt.hash(password, 10); // salt rounds

    //gen verify token & hash it
    const verifyToken = crypto.randomBytes(10).toString('hex');
    const verifyEmailToken = crypto
      .createHash('sha256')
      .update(verifyToken)
      .digest('hex');

    //send verify token
    const emailOptions = {
      subject: 'Please verify your email',
      to: email,
      body: `
                <p>Hi ${username}, </p>
                <p>Welcome to clientlance.io</p>
                <p>Please click the button below to confirm your email address:</p>             
                <a href ='${process.env.VERIFY_EMAIL_URL}/${verifyToken}' target='_blank' style='display: inline-block; color: #ffffff; background-color: #3498db; border: solid 1px #3498db; border-radius: 5px; box-sizing: border-box; cursor: pointer; text-decoration: none; font-size: 14px; font-weight: bold; margin: 15px 0px; padding: 5px 15px; text-transform: capitalize; border-color: #3498db;'>Confirm your email</a>  
                 
                <p>Thanks!</p>
                 <p>Clientlance team</p>
                             
                `,
    };
    //don't wait//they can resend if it fails
    sendEmail(emailOptions);

    ///save user
    const userObject = {
      username,
      password: hashedPwd,
      email,
      verifyEmailToken,
    };

    const newUser = new this.userModel(userObject); //or use .create(obj)
    // Create /save new user
    const user = await newUser.save();

    if (!user) {
      throw new BadRequestException('Check details and try again');
    }

    //create a token that will be sent back as cookie//for resending email
    const resendEmailToken = jwt.sign(
      { id: user._id, email },
      process.env.RESEND_EMAIL_TOKEN_SECRET,
      { expiresIn: '15m' }, //expires in 15 min
    );

    // Create secure cookie with user id in token
    res.cookie('resend', resendEmailToken, {
      httpOnly: false, //readable for displaying email
      secure: true,
      sameSite: 'none', //
      maxAge: 15 * 60 * 1000, //expire in 15 min
    });

    return { message: 'Registered successfully' };
  };

  /*-----------------------------------------------------------
 * RESEND EMAIL
 ------------------------------------------------------------*/

  /**
   * @desc - Resend email token
   * @access - Public
   *
   */
  resendVerifyEmail = async (req: Request) => {
    const cookies = req.cookies;

    if (!cookies?.resend) {
      throw new BadRequestException('Email could not be sent');
    }

    const resendEmailToken: string = cookies.resend; //cookies.jwt is of any type//must be converted to string for err & decoded types to be inferred
    //else you must pass type: err: VerifyBadRequestExceptions | null,  decoded: JwtPayload | string | undefined

    const decoded = jwt.verify(
      resendEmailToken,
      process.env.RESEND_EMAIL_TOKEN_SECRET,
    );

    const foundUser = await this.userModel
      .findById((<{ id: string }>decoded).id)
      .exec();

    if (!foundUser) {
      throw new BadRequestException('Email could not be sent');
    }
    //now resend email with new verify token
    //gen verify token
    const verifyToken = crypto.randomBytes(10).toString('hex');
    const verifyEmailToken = crypto
      .createHash('sha256')
      .update(verifyToken)
      .digest('hex');

    //resend email
    const emailOptions = {
      subject: 'Please verify your email',
      to: foundUser.email,
      body: `
                <p>Hi ${foundUser.username}, </p>
                <p>Welcome to clientlance.io</p>
                <p>Please click the button below to confirm your email address:</p>             
                <a href ='${process.env.VERIFY_EMAIL_URL}/${verifyToken}' target='_blank' style='display: inline-block; color: #ffffff; background-color: #3498db; border: solid 1px #3498db; border-radius: 5px; box-sizing: border-box; cursor: pointer; text-decoration: none; font-size: 14px; font-weight: bold; margin: 15px 0px; padding: 5px 15px; text-transform: capitalize; border-color: #3498db;'>Confirm your email</a>  
                 
                <p>Thanks!</p>
                 <p>Clientlance team</p>
                             
                `,
    };
    //don't wait//they can resend if it fails
    sendEmail(emailOptions);

    //update verify token
    foundUser.verifyEmailToken = verifyEmailToken;

    await foundUser.save();

    return { message: 'Email sent' };
  };

  /*-----------------------------------------------------------
 * UPDATE/PATCH
 ------------------------------------------------------------*/
  //ALLOW USERS TO CHANGE EMAIL BUT DON'T USE EMAIL AS UNIQUE IDENTIFY IN OTHER COLLECTION//USE user: object id //the can populate
  //so you will only need to update email in user collection only//id remains the same
  /**
   * @desc - Update user
   * @access - Private
   *
   */
  updateUser = async (
    id: string,
    profilePic: Express.Multer.File,
    updateUserBody: Partial<UpdateUserBody>,
  ) => {
    const { username, email, phoneNumber, password, newPassword } =
      updateUserBody;

    let response;
    if (profilePic && profilePic.size) {
      response = await this.cloudinary.uploadImage(profilePic).catch(() => {
        throw new BadRequestException('Invalid file type.');
      });
    }

    const publicId = response?.public_id;
    const profileUrl = response?.secure_url;

    //check if id is a valid ObjectId//ObjectIds is constructed only from 24 hex character strings
    if (!mongoose.isValidObjectId(id)) {
      throw new BadRequestException('User not found');
    }

    // Does the user exist to update//exists since we are already here
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!password) {
      throw new BadRequestException('Password is required');
    }

    const match = await bcrypt.compare(password, user.password as string);

    if (!match) {
      throw new BadRequestException('Wrong password');
    }

    // update user
    if (newPassword) user.password = await bcrypt.hash(newPassword, 10);
    if (username) user.username = username;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (profileUrl) user.profileUrl = profileUrl;

    //email changed
    if (email && user.email !== email) {
      //gen verify token & hash it
      const verifyToken = crypto.randomBytes(10).toString('hex');
      const verifyEmailToken = crypto
        .createHash('sha256')
        .update(verifyToken)
        .digest('hex');

      // Check for duplicate email//case insensitive
      const duplicate = await this.userModel
        .findOne({ email })
        .collation({ locale: 'en', strength: 2 })
        .lean()
        .exec();

      // Allow only updates to the original user
      if (duplicate) {
        throw new ConflictException('Duplicate email');
      }

      //update new email and token
      user.newEmail = email;
      user.verifyEmailToken = verifyEmailToken;

      //send un hashed token
      const emailOptions = {
        subject: 'Please verify your email',
        to: email,
        body: `
                <p>Hi ${user.username}, </p>
                <p>Complete changing your email address by confirming it below:</p> 
                <a href ='${process.env.VERIFY_EMAIL_URL}/${verifyToken}' target='_blank' style='display: inline-block; color: #ffffff; background-color: #3498db; border: solid 1px #3498db; border-radius: 5px; box-sizing: border-box; cursor: pointer; text-decoration: none; font-size: 14px; font-weight: bold; margin: 15px 0px; padding: 5px 15px; text-transform: capitalize; border-color: #3498db;'>Confirm your email</a> 
                <p>If you didn't initiate this request, please disregard this email</p>
                <p>Thanks!</p>
                <p>Clientlance team</p>
                             
                `,
      };
      //wait for fail or success//can't resend email
      const response = await sendEmail(emailOptions);
      if (!response) {
        throw new BadRequestException(
          'Account could not be updated. Please try again',
        );
      }
    }

    const updatedUser = await user.save();

    if (!updatedUser) {
      throw new BadRequestException(
        'Account could not be updated. Please try again',
      );
    }

    //return  updated user details
    return {
      id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      profileUrl: updatedUser.profileUrl,
      phoneNumber: updatedUser.phoneNumber,
      newEmail: updatedUser.newEmail,
    };
  };

  /**
   * @desc - Delete a user
   * @access - Private
   *
   */
  deleteUser = async (id: string, res: Response) => {
    if (!mongoose.isValidObjectId(id)) {
      throw new BadRequestException('User not found');
    }

    // Does the user exist to delete?
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    await user.deleteOne();

    //clear refresh token cookie
    res.clearCookie('jwt', {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
    });

    return { message: 'Account deactivated' };
  };
}

//Throwing standard exceptions
//throw new HttpException('Forbidden', HttpStatus.FORBIDDEN); statusCode: 403, message: "Forbidden"
//Built-in HTTP exceptions that inherit from the base HttpException:
// BadRequestException;
// UnauthorizedException;
// NotFoundException;
// ForbiddenException;
// RequestTimeoutException;
// ConflictException;
//eg throw new BadRequestException('Something bad happened') //response body = { "message": "Something bad happened", "statusCode": 400}
//can also pass no arg & default status code message is used
