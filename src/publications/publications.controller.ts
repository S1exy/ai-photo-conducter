import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PublicationsService } from './publications.service';
import { CreateReportDto } from './dto/create-report.dto';

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
  feed(@Query('sort') sort?: string) {
    return this.publications.feed(sort === 'latest' ? 'latest' : 'recommended');
  }

  @Get('publications/:id')
  @UseGuards(JwtAuthGuard)
  detail(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.publications.detail(user.userId, id);
  }

  @Post('publications/:id/like')
  @UseGuards(JwtAuthGuard)
  like(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.publications.like(user.userId, id);
  }

  @Delete('publications/:id/like')
  @UseGuards(JwtAuthGuard)
  unlike(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.publications.unlike(user.userId, id);
  }

  @Post('publications/:id/bookmark')
  @UseGuards(JwtAuthGuard)
  bookmark(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.publications.bookmark(user.userId, id);
  }

  @Delete('publications/:id/bookmark')
  @UseGuards(JwtAuthGuard)
  unbookmark(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.publications.unbookmark(user.userId, id);
  }

  @Post('publications/:id/reports')
  @UseGuards(JwtAuthGuard)
  report(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string, @Body() body: CreateReportDto) {
    return this.publications.report(user.userId, id, body.reasonCode);
  }

  @Post('templates/:id/bookmark')
  @UseGuards(JwtAuthGuard)
  bookmarkTemplate(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.publications.bookmarkTemplate(user.userId, id);
  }

  @Delete('templates/:id/bookmark')
  @UseGuards(JwtAuthGuard)
  unbookmarkTemplate(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.publications.unbookmarkTemplate(user.userId, id);
  }

  @Get('bookmarks')
  @UseGuards(JwtAuthGuard)
  bookmarks(@CurrentUser() user: AuthUser) {
    return this.publications.bookmarks(user.userId);
  }

  @Get('publications/:id/image')
  async image(@Param('id', new ParseUUIDPipe()) id: string, @Res() response: Response): Promise<void> {
    const { asset, stream } = await this.publications.getPublishedImage(id);
    response.type(asset.mimeType);
    response.setHeader('Cache-Control', 'public, max-age=300');
    stream.pipe(response);
  }
}
