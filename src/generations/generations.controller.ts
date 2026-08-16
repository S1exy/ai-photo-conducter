import { BadRequestException, Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateGenerationDto } from './dto/create-generation.dto';
import { GenerationsService } from './generations.service';

@Controller('generations')
@UseGuards(JwtAuthGuard)
export class GenerationsController {
  constructor(private readonly generations: GenerationsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateGenerationDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!idempotencyKey || idempotencyKey.length > 128) {
      throw new BadRequestException('A valid Idempotency-Key header is required');
    }
    return this.generations.create(user.userId, body, idempotencyKey);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.generations.list(user.userId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.generations.get(user.userId, id);
  }
}
