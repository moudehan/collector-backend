import { IsNotEmpty } from 'class-validator';

export class CreateShopDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  description: string;
}
