import { IsEnum, IsOptional } from 'class-validator';
import { PublicationStatus } from '../../generated/prisma/enums';

export class ListReviewsDto {
  @IsOptional()
  @IsEnum(PublicationStatus)
  status?: PublicationStatus;
}
