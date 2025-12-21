import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Article } from 'src/articles/article.entity';
import { UpdateCartItemDto } from 'src/cart/dto/update-cart-item.dto';
import { Repository } from 'typeorm';
import { CartItem } from './cart-item.entity';
import { Cart } from './cart.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
  ) {}

  private async findOrCreateCart(userId: string): Promise<Cart> {
    const existingCart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.article'],
    });

    if (existingCart) {
      return existingCart;
    }

    const newCart = this.cartRepository.create({
      userId,
      currency: 'EUR',
    });

    const savedCart = await this.cartRepository.save(newCart);

    const reloadedCart = await this.cartRepository.findOne({
      where: { id: savedCart.id },
      relations: ['items', 'items.article'],
    });

    if (!reloadedCart) {
      throw new NotFoundException(
        'Impossible de charger le panier nouvellement créé',
      );
    }

    return reloadedCart;
  }

  async getCartForUser(userId: string): Promise<Cart> {
    return this.findOrCreateCart(userId);
  }

  async addToCart(userId: string, dto: AddToCartDto): Promise<Cart> {
    const requestedQuantity = dto.quantity ?? 1;

    if (requestedQuantity <= 0) {
      throw new BadRequestException('La quantité doit être au minimum 1');
    }

    const article = await this.articleRepository.findOne({
      where: { id: dto.articleId },
    });

    if (!article) {
      throw new NotFoundException('Article introuvable');
    }

    const availableQuantity =
      typeof article.quantity === 'number' ? article.quantity : 1;

    if (availableQuantity <= 0) {
      throw new BadRequestException('Article épuisé');
    }

    const cart = await this.findOrCreateCart(userId);

    const existingItem = cart.items.find(
      (item) => item.article.id === dto.articleId,
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + requestedQuantity;

      if (newQuantity > availableQuantity) {
        throw new BadRequestException(
          `Stock insuffisant. Il reste ${availableQuantity} exemplaire(s) de cet article.`,
        );
      }

      existingItem.quantity = newQuantity;
      await this.cartItemRepository.save(existingItem);
    } else {
      if (requestedQuantity > availableQuantity) {
        throw new BadRequestException(
          `Stock insuffisant. Il reste ${availableQuantity} exemplaire(s) de cet article.`,
        );
      }

      const newItem = this.cartItemRepository.create({
        cart,
        article,
        quantity: requestedQuantity,
        unitPrice: article.price,
      });

      await this.cartItemRepository.save(newItem);
    }

    return this.findOrCreateCart(userId);
  }

  async updateCartItem(
    userId: string,
    cartItemId: string,
    dto: UpdateCartItemDto,
  ): Promise<Cart> {
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: cartItemId },
      relations: ['cart', 'article'],
    });

    if (!cartItem) {
      throw new NotFoundException('Ligne de panier introuvable');
    }

    if (cartItem.cart.userId !== userId) {
      throw new ForbiddenException('Ce panier ne vous appartient pas');
    }

    const requestedQuantity = dto.quantity;

    if (requestedQuantity <= 0) {
      await this.cartItemRepository.remove(cartItem);
      return this.findOrCreateCart(userId);
    }

    const article = cartItem.article;
    if (!article) {
      throw new NotFoundException('Article lié au panier introuvable');
    }

    const availableQuantity =
      typeof article.quantity === 'number' ? article.quantity : 1;

    if (availableQuantity <= 0) {
      await this.cartItemRepository.remove(cartItem);
      throw new BadRequestException('Article épuisé');
    }

    if (requestedQuantity > availableQuantity) {
      throw new BadRequestException(
        `Stock insuffisant. Il reste ${availableQuantity} exemplaire(s) de cet article.`,
      );
    }

    cartItem.quantity = requestedQuantity;
    await this.cartItemRepository.save(cartItem);

    return this.findOrCreateCart(userId);
  }

  async removeCartItem(userId: string, cartItemId: string): Promise<Cart> {
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: cartItemId },
      relations: ['cart'],
    });

    if (!cartItem) {
      throw new NotFoundException('Ligne de panier introuvable');
    }

    if (cartItem.cart.userId !== userId) {
      throw new ForbiddenException('Ce panier ne vous appartient pas');
    }

    await this.cartItemRepository.remove(cartItem);

    return this.findOrCreateCart(userId);
  }

  async clearCart(userId: string): Promise<Cart> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.article'],
    });

    if (!cart || cart.items.length === 0) {
      return this.findOrCreateCart(userId);
    }

    await this.cartItemRepository.remove(cart.items);

    return this.findOrCreateCart(userId);
  }
}
