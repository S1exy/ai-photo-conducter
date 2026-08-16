import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AssetsService } from '../assets/assets.service';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OperatorGuard } from '../auth/operator.guard';
import { AdminService } from './admin.service';
import { ListReviewsDto } from './dto/list-reviews.dto';
import { RejectPublicationDto } from './dto/reject-publication.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, OperatorGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly assets: AssetsService,
  ) {}

  @Get('reviews')
  listReviews(@Query() query: ListReviewsDto) {
    return this.admin.listReviews(query.status);
  }

  @Post('reviews/:id/approve')
  approve(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.admin.approve(user.userId, id);
  }

  @Post('reviews/:id/reject')
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: RejectPublicationDto,
  ) {
    return this.admin.reject(user.userId, id, body.reasonCode);
  }

  @Get('reports')
  listReports() {
    return this.admin.listReports();
  }

  @Post('reports/:id/dismiss')
  dismissReport(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.admin.dismissReport(id);
  }

  @Post('reports/:id/remove-publication')
  removeReportedPublication(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.admin.removeReportedPublication(id);
  }

  @Get('assets/:id/file')
  async file(@Param('id', new ParseUUIDPipe()) id: string, @Res() response: Response): Promise<void> {
    const { asset, stream } = await this.assets.getFileById(id);
    response.type(asset.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=60');
    stream.pipe(response);
  }
}
