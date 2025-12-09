import { IsInt, Max, Min } from 'class-validator';

export class RateArticleDto {
  @IsInt()
  @Min(1)
  @Max(5)
  value: number;
}
