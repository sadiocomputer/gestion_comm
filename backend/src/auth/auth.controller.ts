import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SameOriginGuard } from '../common/guards/same-origin.guard';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

type RequestWithCookies = Request & {
  cookies?: { refresh_token?: string };
};

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 10 tentatives par minute et par adresse IP.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.login(dto.phone, dto.password);
    this.authService.setRefreshCookie(response, session.refreshToken);
    return { accessToken: session.accessToken, user: session.user };
  }

  @Post('refresh')
  @UseGuards(SameOriginGuard)
  async refresh(
    @Req() request: RequestWithCookies,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.refresh(
      request.cookies?.refresh_token,
    );
    this.authService.setRefreshCookie(response, session.refreshToken);
    return { accessToken: session.accessToken, user: session.user };
  }

  @Post('logout')
  @UseGuards(SameOriginGuard)
  async logout(
    @Req() request: RequestWithCookies,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(request.cookies?.refresh_token);
    this.authService.clearRefreshCookie(response);
    return { message: 'Déconnecté.' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User) {
    return this.authService.buildSessionUser(user);
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Mot de passe modifié. Reconnecte-toi.' };
  }
}
