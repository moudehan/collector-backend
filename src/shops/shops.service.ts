import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Shop } from 'src/shops/shop.entity';
import { User } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { CreateShopDto } from './dto/create-shop.dto';

@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(Shop)
    private readonly shopRepo: Repository<Shop>,
  ) {}

  createShop(dto: CreateShopDto, userId: string) {
    const shop = this.shopRepo.create({
      ...dto,
      owner: { id: userId } as User,
    });

    return this.shopRepo.save(shop);
  }

  getShopsByUser(userId: string) {
    return this.shopRepo.find({
      where: { owner: { id: userId } },
    });
  }
}
