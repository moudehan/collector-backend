import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  NEW_ARTICLE?: boolean;

  @IsOptional()
  @IsBoolean()
  ARTICLE_UPDATED?: boolean;

  @IsOptional()
  @IsBoolean()
  MAIL_ENABLED?: boolean;

  @IsOptional()
  @IsBoolean()
  ARTICLE_REJECTED?: boolean;

  @IsOptional()
  @IsBoolean()
  ARTICLE_APPROUVED?: boolean;
}
