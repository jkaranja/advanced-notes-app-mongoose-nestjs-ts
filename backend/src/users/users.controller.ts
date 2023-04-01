import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Delete,
  Patch,
  Res,
  Req,
  UseGuards,
  HttpCode,
  UploadedFiles,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { Response, Request } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { SignUpDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

//Controllers are responsible for handling incoming requests and returning responses to the client.
//The routing mechanism controls which controller receives which requests. // using @Controller decorator
//specify an optional route path prefix of users = /users
//mtds inside the controller class are route handlers

@Controller('api/users')
//@UseGuards(RolesGuard)//guards can be controller-scoped, method-scoped, or global-scoped.
export class UsersController {
  //Dependency injection
  //services are injected through the class constructor.
  // Notice the use of the private syntax.
  //This shorthand allows us to both declare and initialize the usersService member immediately in the same louserion.
  //so usersService is same as const usersService = new UsersService()
  constructor(
    private usersService: UsersService,
    configService: ConfigService, //injecting env variables
  ) {}

  @UseGuards(AuthGuard)
  @Get()
  getUser(@Req() req: Request): any {
    //const dbUser = this.configService.get<string>('DATABASE_USER');
    return this.usersService.getUser(req);
  }

  //we use simple classes for dto instead of ts interfaces//classes are preserved in compiled js so can be referred at runtime
  @Post('register')
  registerUser(
    @Body() signUpDto: SignUpDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.usersService.registerUser(signUpDto, response);
  }

  //@Throttle(5, 10) //override option in app//using decorator//not working
  @UseGuards(ThrottlerGuard) //working
  // @SkipThrottle() //skip throttle
  @Post('resend/email')
  @HttpCode(200)
  resendVerifyEmail(@Req() request: Request) {
    return this.usersService.resendVerifyEmail(request);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('profilePic', {
      //storage:  multerStorage,
    }),
  )
  updateUser(
    @UploadedFile() //will be UploadedFile() if using FileInterceptor for one file
    profilePic: Express.Multer.File,
    @Param('id') id: string,
    @Body() updateUserDto: Partial<UpdateUserDto>,
  ) {
    return this.usersService.updateUser(id, profilePic, updateUserDto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  deleteUser(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.usersService.deleteUser(id, res);
  }

  // @Get() //HTTP request method decorator
  // //request handler//it's return value is sent as the response
  // //if you use @Res() response inside req handler signature, you must send response as res.status(200).json() i.e library-specific option
  // register(@Req() request: Request): string {
  //   return 'This action returns all users';
  // }

  // @Post()
  // create(@Body() createUserDto: RegisterDto): string {
  //   return 'This action adds a new user';
  //   //this.usersService.create(createUserDto);
  // }

  //   @Get()
  //   getNotes(@Query() query: ListAllEntities): string {
  //     //console.log(params.id);
  //     return `This action returns a #${params.id} user`;
  //   }

  // @Get(':id')
  // findOne(@Param() params, @Param('id', ParseIntPipe) id: string): string {
  //   console.log(params.id);
  //   return `This action returns a #${params.id} user`;
  // }
  //Pipes--> transforms input data to the desired form  or do validation; otherwise, throw an exception
  //others ParseUUIDPipe//check if id is a valid UUID string
  //the thrown exception in pipes is handled by a a built-in global exception filter
  //   @Get(':id')
  //   async findOne(@Param('id', ParseIntPipe) id: number) {
  //     return this.usersService.findOne(id);
  //   }
}
