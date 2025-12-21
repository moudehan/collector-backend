// src/orders/order-mail.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MailService } from 'src/mail/mail.service';
import { Order } from 'src/orders/order.entity';
import { User } from 'src/users/user.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class OrderMailService {
  private readonly frontUrl: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mailService: MailService,
  ) {
    this.frontUrl = process.env.FRONT_URL ?? 'http://localhost:5173';
  }

  private getUserDisplayName(user: User | null | undefined): string {
    if (!user) return 'Client';
    const parts = [
      user.firstname?.trim() ?? '',
      user.lastname?.trim() ?? '',
    ].filter((p) => p.length > 0);
    return parts.length > 0 ? parts.join(' ') : (user.email ?? 'Client');
  }

  async sendOrderConfirmation(order: Order): Promise<void> {
    const buyer = await this.userRepo.findOne({
      where: { id: order.userId },
      select: ['id', 'email', 'firstname', 'lastname'],
    });

    if (!buyer?.email) return;

    const subject = `Confirmation de votre commande ${order.id}`;
    const link = `${this.frontUrl}/orders/confirmation/${order.id}`;

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px">
        <h2 style="color:#1e4fff">Merci pour votre commande !</h2>
        <p>Bonjour ${this.getUserDisplayName(buyer)},</p>
        <p>Nous avons bien reçu votre paiement. Votre commande <strong>${order.id}</strong> est maintenant enregistrée.</p>
        <p>Montant total : <strong>${order.totalAmount.toFixed(
          2,
        )} ${order.currency}</strong></p>

        <p>
          Vous pouvez consulter le détail de votre commande ici :<br/>
          <a href="${link}" target="_blank">${link}</a>
        </p>

        <br/>
        <small>Collector.shop</small>
      </div>
    `;

    await this.mailService.sendTestMail(buyer.email, subject, html);
  }

  async sendOrderStatusUpdated(order: Order): Promise<void> {
    const buyer = await this.userRepo.findOne({
      where: { id: order.userId },
      select: ['id', 'email', 'firstname', 'lastname'],
    });

    const orderLink = `${this.frontUrl}/orders/track/${order.id}`;

    if (buyer?.email) {
      const subjectBuyer = `Mise à jour de votre commande ${order.id}`;
      const htmlBuyer = `
        <div style="font-family: Arial, sans-serif; padding: 20px">
          <h2 style="color:#1e4fff">Suivi de commande</h2>
          <p>Bonjour ${this.getUserDisplayName(buyer)},</p>
          <p>Le statut de votre commande <strong>${order.id}</strong> a été mis à jour : <strong>${order.status}</strong>.</p>
          <p>
            Suivre ma commande :<br/>
            <a href="${orderLink}" target="_blank">${orderLink}</a>
          </p>
          <br/>
          <small>Collector.shop</small>
        </div>
      `;

      await this.mailService.sendTestMail(buyer.email, subjectBuyer, htmlBuyer);
    }

    const sellerIds: string[] = Array.from(
      new Set(
        order.items
          .map((it) => it.sellerId)
          .filter(
            (id): id is string =>
              typeof id === 'string' && id.trim().length > 0,
          ),
      ),
    );

    if (sellerIds.length === 0) {
      return;
    }

    const sellers = await this.userRepo.find({
      where: { id: In(sellerIds) },
      select: ['id', 'email', 'firstname', 'lastname'],
    });

    for (const seller of sellers) {
      if (!seller.email) continue;

      const sellerItems = order.items.filter((it) => it.sellerId === seller.id);

      const subjectSeller = `Commande ${order.id} mise à jour`;
      const itemsListHtml = sellerItems
        .map(
          (it) =>
            `<li>${it.quantity} × ${it.articleTitle} (${it.unitPrice.toFixed(
              2,
            )} €)</li>`,
        )
        .join('');

      const htmlSeller = `
        <div style="font-family: Arial, sans-serif; padding: 20px">
          <h2 style="color:#1e4fff">Mise à jour de commande</h2>
          <p>Bonjour ${this.getUserDisplayName(seller)},</p>
          <p>Le statut de la commande <strong>${order.id}</strong> contenant vos articles est maintenant : <strong>${order.status}</strong>.</p>
          <p>Articles concernés :</p>
          <ul>${itemsListHtml}</ul>
          <p>
            Détail de la commande (côté acheteur) :<br/>
            <a href="${orderLink}" target="_blank">${orderLink}</a>
          </p>
          <br/>
          <small>Collector.shop</small>
        </div>
      `;

      await this.mailService.sendTestMail(
        seller.email,
        subjectSeller,
        htmlSeller,
      );
    }
  }
}
