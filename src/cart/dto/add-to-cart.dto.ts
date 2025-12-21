import { IsUUID, IsInt, IsOptional, Min } from 'class-validator';

export class AddToCartDto {
  @IsUUID()
  articleId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
