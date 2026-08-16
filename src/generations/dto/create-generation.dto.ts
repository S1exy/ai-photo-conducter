import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class CreateGenerationDto {
  @IsUUID()
  templateVersionId!: string;

  @IsUUID()
  inputAssetId!: string;

  @IsIn(['1:1', '3:4', '4:3', '9:16', '16:9'])
  aspectRatio!: string;

  @IsOptional()
  @IsUUID()
  sourcePublicationId?: string;
}
