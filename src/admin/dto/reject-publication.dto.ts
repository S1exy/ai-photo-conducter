import { IsIn, IsString } from 'class-validator';

export const REJECTION_REASONS = [
  'ILLEGAL_CONTENT',
  'SEXUAL_CONTENT',
  'VIOLENCE_DANGER',
  'PRIVACY_RISK',
  'COPYRIGHT_RISK',
  'LOW_QUALITY',
  'OTHER_PLATFORM_RULES',
] as const;

export class RejectPublicationDto {
  @IsString()
  @IsIn(REJECTION_REASONS)
  reasonCode!: string;
}
