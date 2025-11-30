import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop } from './shop.entity';

@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(Shop)
    private shopRepo: Repository<Shop>,
  ) {}

  createShop(dto: any, userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const shop = this.shopRepo.create({
      ...dto,
      owner: { id: userId },
    });
    return this.shopRepo.save(shop);
  }

  getShopsByUser(userId: string) {
    return this.shopRepo.find({ where: { owner: { id: userId } } });
  }
}
