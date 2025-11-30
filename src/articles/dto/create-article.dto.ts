import { IsNotEmpty, IsNumber, Min, MaxLength } from 'class-validator';

export class CreateArticleDto {
  @IsNotEmpty()
  title: string;

  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @IsNumber()
  @Min(1)
  price: number;

  @IsNumber()
  shipping_cost: number;

  @IsNotEmpty()
  shopId: string;
}
