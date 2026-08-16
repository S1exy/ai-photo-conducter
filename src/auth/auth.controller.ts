import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { LocalAdminLoginDto } from './dto/local-admin-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('wechat-login')
  login(@Body() body: WechatLoginDto) {
    return this.auth.login(body.code);
  }

  @Post('local-admin-login')
  localAdminLogin(@Body() body: LocalAdminLoginDto) {
    return this.auth.localAdminLogin(body.password);
  }
}
