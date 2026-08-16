import { IsIn, IsString } from 'class-validator';

export const REPORT_REASONS = [
  'ILLEGAL_CONTENT', 'SEXUAL_CONTENT', 'VIOLENCE_DANGER', 'PRIVACY_RISK',
  'COPYRIGHT_RISK', 'UNCOMFORTABLE', 'OTHER_PLATFORM_RULES',
] as const;

export class CreateReportDto {
  @IsString()
  @IsIn(REPORT_REASONS)
  reasonCode!: string;
}
