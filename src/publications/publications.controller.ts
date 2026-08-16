import { Controller, Get, Param, ParseUUIDPipe, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PublicationsService } from './publications.service';

@Controller()
export class PublicationsController {
  constructor(private readonly publications: PublicationsService) {}

  @Get('creations')
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUser() user: AuthUser) {
    return this.publications.listMine(user.userId);
  }

  @Post('creations/:id/publication')
  @UseGuards(JwtAuthGuard)
  submit(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.publications.submit(user.userId, id);
  }

  @Post('publications/:id/withdraw')
  @UseGuards(JwtAuthGuard)
  withdraw(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.publications.withdraw(user.userId, id);
  }

  @Get('publications/feed')
  feed() {
    return this.publications.feed();
  }

  @Get('publications/:id/image')
  async image(@Param('id', new ParseUUIDPipe()) id: string, @Res() response: Response): Promise<void> {
    const { asset, stream } = await this.publications.getPublishedImage(id);
    response.type(asset.mimeType);
    response.setHeader('Cache-Control', 'public, max-age=300');
    stream.pipe(response);
  }
}
