import { createHash } from 'node:crypto';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

interface WechatSessionResponse {
  openid?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  async login(code: string) {
    const session = await this.exchangeCode(code);
    const systemNickname = this.nicknameFor(session.openid);
    const user = await this.prisma.user.upsert({
      where: { openid: session.openid },
      update: { unionid: session.unionid ?? undefined },
      create: {
        openid: session.openid,
        unionid: session.unionid,
        systemNickname,
      },
      select: { id: true, systemNickname: true, role: true, status: true },
    });

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('User account is unavailable');
    }

    return {
      accessToken: await this.jwt.signAsync({ sub: user.id }),
      expiresIn: 7 * 24 * 60 * 60,
      user: {
        id: user.id,
        nickname: user.systemNickname,
        role: user.role,
      },
    };
  }

  private async exchangeCode(code: string): Promise<{ openid: string; unionid?: string }> {
    if (this.config.get<boolean>('DEV_LOGIN_ENABLED') && code.startsWith('dev-')) {
      return { openid: `dev_${createHash('sha256').update(code).digest('hex').slice(0, 32)}` };
    }

    const appid = this.config.get<string>('WECHAT_APPID');
    const secret = this.config.get<string>('WECHAT_SECRET');
    if (!appid || !secret) {
      throw new UnauthorizedException('WeChat login is not configured');
    }

    const query = new URLSearchParams({
      appid,
      secret,
      js_code: code,
      grant_type: 'authorization_code',
    });
    const response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${query}`);
    const data = (await response.json()) as WechatSessionResponse;
    if (!response.ok || !data.openid || data.errcode) {
      throw new UnauthorizedException(data.errmsg || 'WeChat login failed');
    }
    return { openid: data.openid, unionid: data.unionid };
  }

  private nicknameFor(openid: string): string {
    const suffix = createHash('sha256').update(openid).digest('hex').slice(0, 6).toUpperCase();
    return `创作者 ${suffix}`;
  }
}
