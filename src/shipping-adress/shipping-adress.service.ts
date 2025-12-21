import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ShippingAddressDto } from 'src/shipping-adress/dto/shipping-adress.dto';
import { ShippingAddress } from 'src/shipping-adress/shipping-adress.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ShippingAddressService {
  constructor(
    @InjectRepository(ShippingAddress)
    private readonly repo: Repository<ShippingAddress>,
  ) {}

  async getForUser(userId: string): Promise<ShippingAddress | null> {
    return this.repo.findOne({ where: { userId } });
  }

  async upsertForUser(
    userId: string,
    dto: ShippingAddressDto,
  ): Promise<ShippingAddress> {
    const existing = await this.getForUser(userId);

    if (existing) {
      const merged = this.repo.merge(existing, {
        ...dto,
      });
      return this.repo.save(merged);
    }

    const created = this.repo.create({
      userId,
      ...dto,
    });

    return this.repo.save(created);
  }
}
