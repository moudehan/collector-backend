import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RejectArticleDto {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'La raison doit être une chaîne de caractères.' })
  @IsNotEmpty({ message: 'La raison est obligatoire.' })
  @MinLength(5, { message: 'La raison doit contenir au moins 5 caractères.' })
  @MaxLength(500, { message: 'La raison ne doit pas dépasser 500 caractères.' })
  reason!: string;
}
