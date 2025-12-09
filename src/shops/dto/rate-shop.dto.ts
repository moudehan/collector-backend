import { IsInt, Max, Min } from 'class-validator';

export class RateShopDto {
  @IsInt()
  @Min(1)
  @Max(5)
  value: number;
}
