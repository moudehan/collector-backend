import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateArticleDto {
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

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La quantité doit être un entier' })
  @Min(1, { message: 'La quantité minimale est 1' })
  quantity?: number;

  @IsOptional()
  @IsString({ message: "L'époque doit être une chaîne de caractères" })
  vintageEra?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "L'année de production doit être un entier" })
  @Min(1900, { message: "L'année minimale est 1900" })
  @Max(new Date().getFullYear() + 1, {
    message: "L'année de production est trop élevée",
  })
  productionYear?: number;

  @IsOptional()
  @IsString({ message: "L'état doit être une chaîne de caractères" })
  conditionLabel?: string;

  @IsOptional()
  @IsString({ message: 'Les notes vintage doivent être une chaîne' })
  vintageNotes?: string;
}
