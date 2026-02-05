import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CartService } from './cart.service';
import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { Article, ArticleStatus } from 'src/articles/article.entity';
import { createMockRepository } from '../../test/utils/mock-repository';
import { AddToCartDto } from 'src/cart/dto/add-to-cart.dto';
import { UpdateCartItemDto } from 'src/cart/dto/update-cart-item.dto';
import { User } from 'src/users/user.entity';
import { Shop } from 'src/shops/shop.entity';
import { Category } from 'src/categories/category.entity';

describe('CartService', () => {
  let service: CartService;
  const cartRepo = createMockRepository();
  const cartItemRepo = createMockRepository();
  const articleRepo = createMockRepository();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getRepositoryToken(Cart), useValue: cartRepo },
        { provide: getRepositoryToken(CartItem), useValue: cartItemRepo },
        { provide: getRepositoryToken(Article), useValue: articleRepo },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('addToCart should throw when article not found', async () => {
    (articleRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
    await expect(
      service.addToCart('u1', { articleId: 'a1', quantity: 1 } as AddToCartDto),
    ).rejects.toThrow('Article introuvable');
  });

  it('addToCart should add item when available', async () => {
    (articleRepo.findOne as jest.Mock).mockResolvedValueOnce({
      id: 'a1',
      quantity: 10,
      price: 5,
    } as Article);
    const savedCart: Partial<Cart> = { id: 'c1', items: [] };
    (cartRepo.findOne as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(savedCart)
      .mockResolvedValue(savedCart);
    (cartRepo.create as jest.Mock).mockReturnValueOnce(savedCart as Cart);
    (cartRepo.save as jest.Mock).mockResolvedValueOnce(savedCart as Cart);
    const savedCartItem: Partial<CartItem> = { id: 'ci1' };
    (cartItemRepo.create as jest.Mock).mockReturnValueOnce(
      savedCartItem as CartItem,
    );
    (cartItemRepo.save as jest.Mock).mockResolvedValueOnce(
      savedCartItem as CartItem,
    );

    const res = await service.addToCart('u1', {
      articleId: 'a1',
      quantity: 2,
    });
    expect(cartItemRepo.save).toHaveBeenCalled();
    expect(res).toBeDefined();
  });

  it('addToCart should throw when quantity <= 0', async () => {
    await expect(
      service.addToCart('u1', { articleId: 'a1', quantity: 0 } as AddToCartDto),
    ).rejects.toThrow('La quantité doit être au minimum 1');
  });

  it('addToCart should throw when article is out of stock', async () => {
    (articleRepo.findOne as jest.Mock).mockResolvedValueOnce({
      id: 'a1',
      quantity: 0,
      price: 5,
    } as Article);

    await expect(
      service.addToCart('u1', { articleId: 'a1', quantity: 1 } as AddToCartDto),
    ).rejects.toThrow('Article épuisé');
  });

  it('addToCart should throw when existing item would exceed stock', async () => {
    (articleRepo.findOne as jest.Mock).mockResolvedValueOnce({
      id: 'a1',
      quantity: 3,
      price: 5,
    } as Article);

    const cartWithItem: Partial<Cart> = {
      id: 'c1',
      items: [
        {
          id: 'ci1',
          article: {
            id: 'a1',
            shop: new Shop(),
            seller: new User(),
            title: '',
            description: '',
            price: 0,
            shipping_cost: 0,
            status: ArticleStatus.PENDING,
            category: new Category(),
            likes: [],
            likesCount: 0,
            fraud_alerts: [],
            price_history: [],
            images: [],
            ratings: [],
            avgRating: 0,
            ratingsCount: 0,
            quantity: 0,
            vintageEra: null,
            productionYear: null,
            conditionLabel: null,
            vintageNotes: null,
            created_at: new Date(),
            updated_at: new Date(),
          },
          quantity: 2,
          cart: new Cart(),
          unitPrice: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
    (cartRepo.findOne as jest.Mock).mockResolvedValue(cartWithItem);

    await expect(
      service.addToCart('u1', { articleId: 'a1', quantity: 2 }),
    ).rejects.toThrow('Stock insuffisant');
  });

  it('addToCart should increment quantity when item exists and stock is sufficient', async () => {
    (articleRepo.findOne as jest.Mock).mockResolvedValueOnce({
      id: 'a1',
      quantity: 10,
      price: 5,
    } as Article);

    const existingItem: Partial<CartItem> = {
      id: 'ci1',
      article: { id: 'a1' },
      quantity: 2,
    } as Partial<CartItem>;

    const cartWithItem: Partial<Cart> = {
      id: 'c1',
      items: [existingItem as CartItem],
    };
    (cartRepo.findOne as jest.Mock).mockResolvedValue(cartWithItem);
    (cartItemRepo.save as jest.Mock).mockResolvedValue({
      ...existingItem,
      quantity: 5,
    });

    const res = await service.addToCart('u1', {
      articleId: 'a1',
      quantity: 3,
    });

    expect(cartItemRepo.save).toHaveBeenCalled();
    expect(res).toBeDefined();
  });

  it('getCartForUser should throw when new cart cannot be reloaded', async () => {
    (cartRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
    (cartRepo.create as jest.Mock).mockReturnValueOnce({
      userId: 'u1',
    } as Cart);
    (cartRepo.save as jest.Mock).mockResolvedValueOnce({ id: 's1' } as Cart);
    (cartRepo.findOne as jest.Mock).mockResolvedValueOnce(null);

    await expect(service.getCartForUser('u1')).rejects.toThrow(
      'Impossible de charger le panier nouvellement créé',
    );
  });

  it('updateCartItem should throw when cart item not found', async () => {
    (cartItemRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
    await expect(
      service.updateCartItem('u1', 'ci1', { quantity: 2 } as UpdateCartItemDto),
    ).rejects.toThrow('Ligne de panier introuvable');
  });

  it('updateCartItem should throw forbidden when cart does not belong to user', async () => {
    (cartItemRepo.findOne as jest.Mock).mockResolvedValueOnce({
      id: 'ci1',
      cart: { userId: 'other' },
    });

    await expect(
      service.updateCartItem('u1', 'ci1', { quantity: 2 } as UpdateCartItemDto),
    ).rejects.toThrow('Ce panier ne vous appartient pas');
  });

  it('updateCartItem should remove item when requested quantity <= 0', async () => {
    const cartItem: Partial<CartItem> = {
      id: 'ci1',
      cart: {
        userId: 'u1',
        id: '',
        items: [],
        currency: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      article: {
        id: 'a1',
        shop: new Shop(),
        seller: new User(),
        title: '',
        description: '',
        price: 0,
        shipping_cost: 0,
        status: ArticleStatus.PENDING,
        category: new Category(),
        likes: [],
        likesCount: 0,
        fraud_alerts: [],
        price_history: [],
        images: [],
        ratings: [],
        avgRating: 0,
        ratingsCount: 0,
        quantity: 0,
        vintageEra: null,
        productionYear: null,
        conditionLabel: null,
        vintageNotes: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    };
    (cartItemRepo.findOne as jest.Mock).mockResolvedValueOnce(cartItem);
    (cartItemRepo.remove as jest.Mock).mockResolvedValueOnce(undefined);
    (cartRepo.findOne as jest.Mock).mockResolvedValueOnce({
      id: 'c1',
      items: [],
    });

    const res = await service.updateCartItem('u1', 'ci1', {
      quantity: 0,
    } as UpdateCartItemDto);
    expect(cartItemRepo.remove).toHaveBeenCalled();
    expect(res).toBeDefined();
  });

  it('updateCartItem should remove and throw when article out of stock', async () => {
    const cartItem: Partial<CartItem> = {
      id: 'ci1',
      cart: {
        userId: 'u1',
        id: '',
        items: [],
        currency: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      article: {
        id: 'a1',
        quantity: 0,
        shop: new Shop(),
        seller: new User(),
        title: '',
        description: '',
        price: 0,
        shipping_cost: 0,
        status: ArticleStatus.PENDING,
        category: new Category(),
        likes: [],
        likesCount: 0,
        fraud_alerts: [],
        price_history: [],
        images: [],
        ratings: [],
        avgRating: 0,
        ratingsCount: 0,
        vintageEra: null,
        productionYear: null,
        conditionLabel: null,
        vintageNotes: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    };
    (cartItemRepo.findOne as jest.Mock).mockResolvedValueOnce(cartItem);
    (cartItemRepo.remove as jest.Mock).mockResolvedValueOnce(undefined);

    await expect(
      service.updateCartItem('u1', 'ci1', { quantity: 2 } as UpdateCartItemDto),
    ).rejects.toThrow('Article épuisé');
  });

  it('updateCartItem should throw when requested quantity > available', async () => {
    const cartItem: Partial<CartItem> = {
      id: 'ci1',
      cart: {
        userId: 'u1',
        id: '',
        items: [],
        currency: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      article: {
        id: 'a1',
        quantity: 3,
        shop: new Shop(),
        seller: new User(),
        title: '',
        description: '',
        price: 0,
        shipping_cost: 0,
        status: ArticleStatus.PENDING,
        category: new Category(),
        likes: [],
        likesCount: 0,
        fraud_alerts: [],
        price_history: [],
        images: [],
        ratings: [],
        avgRating: 0,
        ratingsCount: 0,
        vintageEra: null,
        productionYear: null,
        conditionLabel: null,
        vintageNotes: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    };
    (cartItemRepo.findOne as jest.Mock).mockResolvedValueOnce(cartItem);

    await expect(
      service.updateCartItem('u1', 'ci1', { quantity: 5 }),
    ).rejects.toThrow('Stock insuffisant');
  });

  it('updateCartItem should update quantity successfully', async () => {
    const cartItem: Partial<CartItem> = {
      id: 'ci1',
      cart: {
        userId: 'u1',
        id: '',
        items: [],
        currency: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      article: {
        id: 'a1',
        quantity: 10,
        shop: new Shop(),
        seller: new User(),
        title: '',
        description: '',
        price: 0,
        shipping_cost: 0,
        status: ArticleStatus.PENDING,
        category: new Category(),
        likes: [],
        likesCount: 0,
        fraud_alerts: [],
        price_history: [],
        images: [],
        ratings: [],
        avgRating: 0,
        ratingsCount: 0,
        vintageEra: null,
        productionYear: null,
        conditionLabel: null,
        vintageNotes: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      quantity: 2,
    };
    (cartItemRepo.findOne as jest.Mock).mockResolvedValueOnce(cartItem);
    (cartItemRepo.save as jest.Mock).mockResolvedValueOnce({
      ...cartItem,
      quantity: 5,
    });
    (cartRepo.findOne as jest.Mock).mockResolvedValueOnce({
      id: 'c1',
      items: [],
    });

    const res = await service.updateCartItem('u1', 'ci1', {
      quantity: 5,
    });
    expect(cartItemRepo.save).toHaveBeenCalled();
    expect(res).toBeDefined();
  });

  it('removeCartItem should throw when not found', async () => {
    (cartItemRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.removeCartItem('u1', 'ci1')).rejects.toThrow(
      'Ligne de panier introuvable',
    );
  });

  it('removeCartItem should throw forbidden when not owner', async () => {
    (cartItemRepo.findOne as jest.Mock).mockResolvedValueOnce({
      id: 'ci1',
      cart: { userId: 'other' },
    });
    await expect(service.removeCartItem('u1', 'ci1')).rejects.toThrow(
      'Ce panier ne vous appartient pas',
    );
  });

  it('removeCartItem should remove and return cart', async () => {
    (cartItemRepo.findOne as jest.Mock).mockResolvedValueOnce({
      id: 'ci1',
      cart: { userId: 'u1' },
    });
    (cartItemRepo.remove as jest.Mock).mockResolvedValueOnce(undefined);
    (cartRepo.findOne as jest.Mock).mockResolvedValueOnce({
      id: 'c1',
      items: [],
    });

    const res = await service.removeCartItem('u1', 'ci1');
    expect(cartItemRepo.remove).toHaveBeenCalled();
    expect(res).toBeDefined();
  });

  it('clearCart should remove items when cart has items', async () => {
    const cartWithItems: Partial<Cart> = {
      id: 'c1',
      items: [{ id: 'ci1' } as CartItem],
    };
    (cartRepo.findOne as jest.Mock)
      .mockResolvedValueOnce(cartWithItems)
      .mockResolvedValueOnce({ id: 'c1', items: [] });
    (cartItemRepo.remove as jest.Mock).mockResolvedValueOnce(undefined);

    const res = await service.clearCart('u1');
    expect(cartItemRepo.remove).toHaveBeenCalled();
    expect(res).toBeDefined();
  });

  it('clearCart should return cart when none or empty', async () => {
    (cartRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
    (cartRepo.create as jest.Mock).mockReturnValueOnce({
      userId: 'u1',
    } as Cart);
    (cartRepo.save as jest.Mock).mockResolvedValueOnce({ id: 's1' } as Cart);
    (cartRepo.findOne as jest.Mock).mockResolvedValueOnce({
      id: 's1',
      items: [],
    });

    const res = await service.clearCart('u1');
    expect(res).toBeDefined();
  });
});
