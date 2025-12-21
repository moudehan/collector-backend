import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Article } from 'src/articles/article.entity';
import type { Cart } from 'src/cart/cart.entity';
import { ShippingAddress } from 'src/shipping-adress/shipping-adress.entity';
import { In, Repository } from 'typeorm';
import { OrderItem } from './order-item.entity';
import { OrderMailService } from './order-mail.service';
import { OrderStatus } from './order-status.enum';
import { Order } from './order.entity';

interface OrderUserSnapshot {
  id: string;
  firstname?: string | null;
  lastname?: string | null;
}

interface OrderShopSnapshot {
  id: string;
  name: string;
  owner?: OrderUserSnapshot | null;
}

interface OrderArticleSnapshot {
  id: string;
  title: string;
  shipping_cost?: number | string | null;
  shippingCost?: number | string | null;
  shop?: OrderShopSnapshot | null;
}

type CartItemWithArticle = Cart['items'][number] & {
  article: OrderArticleSnapshot;
};

type CartWithArticle = Cart & {
  items: CartItemWithArticle[];
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
    private readonly orderMailService: OrderMailService,
  ) {}

  private normalizeShippingCost(
    raw: number | string | null | undefined,
  ): number {
    if (raw == null) return 0;
    if (typeof raw === 'number') return raw;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private async loadArticleSnapshots(
    articleIds: string[],
  ): Promise<Map<string, OrderArticleSnapshot>> {
    if (articleIds.length === 0) {
      return new Map<string, OrderArticleSnapshot>();
    }

    const uniqueIds = Array.from(new Set(articleIds));

    const articles = await this.articleRepo.find({
      where: { id: In(uniqueIds) },
      relations: ['shop', 'shop.owner'],
    });

    const map = new Map<string, OrderArticleSnapshot>();

    for (const art of articles) {
      const shopEntity = art.shop;
      const ownerEntity = shopEntity?.owner ?? null;

      const shopSnapshot: OrderShopSnapshot | null = shopEntity
        ? {
            id: shopEntity.id,
            name: shopEntity.name,
            owner: ownerEntity
              ? {
                  id: ownerEntity.id,
                  firstname: ownerEntity.firstname,
                  lastname: ownerEntity.lastname,
                }
              : null,
          }
        : null;

      const shippingSnake =
        (art as unknown as { shipping_cost?: number | string | null })
          .shipping_cost ?? null;
      const shippingCamel =
        (art as unknown as { shippingCost?: number | string | null })
          .shippingCost ?? null;

      const snapshot: OrderArticleSnapshot = {
        id: art.id,
        title: art.title,
        shipping_cost: shippingSnake,
        shippingCost: shippingCamel,
        shop: shopSnapshot,
      };

      map.set(art.id, snapshot);
    }

    return map;
  }

  async createFromCart(params: {
    userId: string;
    cart: Cart;
    total: number;
    currency: string;
    paymentIntentId: string;
    address: ShippingAddress;
  }): Promise<Order> {
    const { userId, cart, total, currency, paymentIntentId, address } = params;

    const cartWithArticle = cart as CartWithArticle;

    if (!cartWithArticle.items || cartWithArticle.items.length === 0) {
      throw new BadRequestException('Panier vide');
    }

    const orderedByArticle = new Map<string, number>();

    for (const item of cartWithArticle.items) {
      if (!item.article || !item.article.id) {
        throw new BadRequestException('Article manquant dans le panier');
      }
      const current = orderedByArticle.get(item.article.id) ?? 0;
      orderedByArticle.set(item.article.id, current + item.quantity);
    }

    const articleIds = Array.from(orderedByArticle.keys());

    const articles = await this.articleRepo.find({
      where: { id: In(articleIds) },
    });

    if (articles.length !== articleIds.length) {
      throw new NotFoundException(
        'Un ou plusieurs articles du panier sont introuvables',
      );
    }

    for (const art of articles) {
      const orderedQty = orderedByArticle.get(art.id) ?? 0;

      const currentStock =
        typeof art.quantity === 'number' && art.quantity > 0 ? art.quantity : 0;

      if (currentStock < orderedQty) {
        throw new BadRequestException(
          `Stock insuffisant pour l'article "${art.title}". Disponible : ${currentStock}, demandé : ${orderedQty}`,
        );
      }

      art.quantity = currentStock - orderedQty;
    }

    await this.articleRepo.save(articles);

    const order = this.orderRepo.create({
      userId,
      totalAmount: total,
      currency,
      status: OrderStatus.PAID,
      stripePaymentIntentId: paymentIntentId,
      shippingFullName: address.fullName,
      shippingLine1: address.line1,
      shippingLine2: address.line2 ?? '',
      shippingPostalCode: address.postalCode,
      shippingCity: address.city,
      shippingCountry: address.country,
      shippingPhone: address.phone ?? '',
    });

    const savedOrder = await this.orderRepo.save(order);

    const articleSnapshotsMap = await this.loadArticleSnapshots(articleIds);

    const itemsToSave: OrderItem[] = cartWithArticle.items.map((cartItem) => {
      const articleFromCart: OrderArticleSnapshot = cartItem.article;
      const articleFromDb =
        articleSnapshotsMap.get(articleFromCart.id) ?? articleFromCart;

      const shop: OrderShopSnapshot | null | undefined = articleFromDb.shop;
      const owner: OrderUserSnapshot | null | undefined = shop?.owner ?? null;

      const shippingCostRaw =
        articleFromDb.shipping_cost ?? articleFromDb.shippingCost ?? 0;
      const shippingCost = this.normalizeShippingCost(shippingCostRaw);

      const sellerNameParts = [
        owner?.firstname?.trim() ?? '',
        owner?.lastname?.trim() ?? '',
      ].filter((s) => s.length > 0);

      const sellerName = sellerNameParts.join(' ').trim();

      const item = this.orderItemRepo.create({
        order: savedOrder,
        orderId: savedOrder.id,
        articleId: articleFromDb.id,
        articleTitle: articleFromDb.title,
        unitPrice: cartItem.unitPrice,
        quantity: cartItem.quantity,
        shippingCost,
        shopId: shop?.id ?? '',
        shopName: shop?.name ?? '',
        sellerId: owner?.id ?? '',
        sellerName,
      });

      return item;
    });

    const savedItems = await this.orderItemRepo.save(itemsToSave);

    savedOrder.items = savedItems;

    void this.orderMailService.sendOrderConfirmation(savedOrder);

    return savedOrder;
  }

  async getMyOrders(userId: string): Promise<Order[]> {
    return this.orderRepo.find({
      where: { userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async getMySales(userId: string): Promise<OrderItem[]> {
    return this.orderItemRepo
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.order', 'order')
      .where('item.sellerId = :userId', { userId })
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }

  async getByIdForUser(orderId: string, userId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (!order || order.userId !== userId) {
      throw new NotFoundException('Commande introuvable');
    }

    return order;
  }

  async updateStatus(
    orderId: string,
    newStatus: OrderStatus,
    actorUserId: string,
  ): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    const isSeller = order.items.some((item) => item.sellerId === actorUserId);
    if (!isSeller) {
      throw new ForbiddenException(
        'Vous ne pouvez pas modifier le statut de cette commande',
      );
    }

    order.status = newStatus;
    const saved = await this.orderRepo.save(order);

    void this.orderMailService.sendOrderStatusUpdated(saved);

    return saved;
  }
}
