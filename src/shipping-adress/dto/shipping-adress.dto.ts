import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class ShippingAddressDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  line1: string;

  @IsString()
  @IsOptional()
  line2?: string;

  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @Length(2, 2)
  country: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
