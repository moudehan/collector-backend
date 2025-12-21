import { Type } from 'class-transformer';
import { IsDefined, ValidateNested } from 'class-validator';
import { ShippingAddressDto } from 'src/shipping-adress/dto/shipping-adress.dto';

export class CreatePaymentIntentDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  address: ShippingAddressDto;
}
