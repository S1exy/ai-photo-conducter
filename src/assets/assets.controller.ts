import { BadRequestException, Controller, Get, Param, ParseUUIDPipe, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssetsService } from './assets.service';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Post('images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { files: 1, fileSize: 12 * 1024 * 1024 } }))
  upload(@CurrentUser() user: AuthUser, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Image file is required');
    return this.assets.uploadInput(user.userId, file);
  }

  @Get(':id/file')
  async file(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('token') token: string,
    @Res() response: Response,
  ): Promise<void> {
    const { asset, stream } = await this.assets.getAuthorizedFile(id, token);
    response.type(asset.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=300');
    stream.pipe(response);
  }
}
