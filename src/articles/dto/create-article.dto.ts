import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';

export class CreateArticleDto {
  [x: string]: any;
  @IsString()
  @IsNotEmpty({ message: 'Le titre est obligatoire' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'La description est obligatoire' })
  description: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Le prix doit être un nombre' })
  price: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'Les frais de livraison doivent être un nombre' })
  shipping_cost: number;

  @IsUUID(undefined, { message: 'Un shopId valide est requis' })
  shopId: string;

  @IsUUID(undefined, { message: 'Une catégorie valide est requise' })
  categoryId: string;
}
