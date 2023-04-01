import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { GoogleOAuthGuard } from './google-oauth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(200)
  login(
    @Body() loginDto: any,
    @Res({ passthrough: true }) response: Response,
  ): any {
    return this.authService.login(loginDto, response);
  }

  @UseGuards(ThrottlerGuard)
  @Get('sso/google')
  @UseGuards(GoogleOAuthGuard)
  googleAuth() {
    return null;
  }

  @Get('sso/google/callback')
  @UseGuards(GoogleOAuthGuard)
  googleAuthRedirect(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.authRedirect(req, res);
  }

  @Post('verify/:verifyToken')
  @HttpCode(200)
  verifyEmail(@Param('verifyToken') verifyToken: string) {
    return this.authService.verifyEmail(verifyToken);
  }

  @Post('forgot')
  @HttpCode(200)
  forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset/:resetToken')
  @HttpCode(200)
  resetPassword(
    @Param('resetToken') resetToken: string,
    @Body('password') password: string,
  ) {
    return this.authService.resetPassword(resetToken, password);
  }

  @Get('refresh')
  refresh(@Req() req: Request) {
    return this.authService.refresh(req);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(req, res);
  }
}
