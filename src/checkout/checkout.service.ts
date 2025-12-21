import { BadRequestException, Injectable } from '@nestjs/common';
import type { Cart } from 'src/cart/cart.entity';
import { CartService } from 'src/cart/cart.service';
import { OrdersService } from 'src/orders/orders.service';
import { ShippingAddressService } from 'src/shipping-adress/shipping-adress.service';
import Stripe from 'stripe';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

type CartArticleForCheckout = {
  id: string;
  title: string;
  shipping_cost?: number | string | null;
};

type CartItemForCheckout = Cart['items'][number] & {
  article: CartArticleForCheckout;
};

type CartForCheckout = Cart & {
  items: CartItemForCheckout[];
};

@Injectable()
export class CheckoutService {
  private readonly stripe: Stripe;

  constructor(
    private readonly cartService: CartService,
    private readonly shippingAddressService: ShippingAddressService,
    private readonly ordersService: OrdersService,
  ) {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      throw new Error('STRIPE_SECRET_KEY non configuré');
    }

    this.stripe = new Stripe(secret, {
      apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
    });
  }

  private computeTotals(cart: CartForCheckout): {
    subtotal: number;
    shipping: number;
    total: number;
  } {
    const subtotal = cart.items.reduce(
      (acc, item) => acc + item.quantity * item.unitPrice,
      0,
    );

    const shipping = cart.items.reduce((acc, item) => {
      const raw = item.article.shipping_cost;

      let cost: number;
      if (raw == null) {
        cost = 0;
      } else if (typeof raw === 'number') {
        cost = raw;
      } else {
        const parsed = Number(raw);
        cost = Number.isFinite(parsed) ? parsed : 0;
      }

      return acc + cost;
    }, 0);

    const total = subtotal + shipping;

    return { subtotal, shipping, total };
  }

  async createPaymentIntent(userId: string, dto: CreatePaymentIntentDto) {
    const savedAddress = await this.shippingAddressService.upsertForUser(
      userId,
      dto.address,
    );

    const cartRaw = await this.cartService.getCartForUser(userId);

    if (!cartRaw || cartRaw.items.length === 0) {
      throw new BadRequestException('Panier vide');
    }

    const cart = cartRaw as CartForCheckout;
    const { total } = this.computeTotals(cart);

    const amountInCents = Math.round(total * 100);
    if (amountInCents <= 0) {
      throw new BadRequestException('Montant invalide');
    }

    const currency = (cart.currency ?? 'EUR').toString().toLowerCase() || 'eur';

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      payment_method_types: ['card'],
      metadata: {
        userId,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      total,
      currency: cart.currency,
      shippingAddress: savedAddress,
    };
  }

  async confirmOrder(userId: string, paymentIntentId: string) {
    const paymentIntent =
      await this.stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      throw new BadRequestException('PaymentIntent introuvable côté Stripe.');
    }

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException('Paiement non confirmé côté Stripe.');
    }

    const cartRaw = await this.cartService.getCartForUser(userId);
    if (!cartRaw || cartRaw.items.length === 0) {
      throw new BadRequestException('Panier vide.');
    }

    const cart = cartRaw as CartForCheckout;
    const { total } = this.computeTotals(cart);

    const address = await this.shippingAddressService.getForUser(userId);

    if (!address) {
      throw new BadRequestException(
        'Adresse de livraison introuvable. Merci de recommencer la commande.',
      );
    }

    const order = await this.ordersService.createFromCart({
      userId,
      cart,
      total,
      currency: cart.currency ?? 'EUR',
      paymentIntentId,
      address,
    });

    await this.cartService.clearCart(userId);

    return order;
  }
}
