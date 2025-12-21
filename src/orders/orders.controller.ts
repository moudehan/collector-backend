import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';

import { KeycloakAuthGuard } from 'src/auth/keycloak-auth.guard';
import { CurrentUser } from 'src/auth/user.decorator';
import type { JwtUser } from 'src/auth/user.type';
import { UpdateOrderStatusDto } from 'src/orders/dto/update-order-status.tdo';
import { OrdersService } from './orders.service';

@UseGuards(KeycloakAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get('mine')
  getMyOrders(@CurrentUser() user: JwtUser) {
    return this.service.getMyOrders(user.sub);
  }

  @Get('my-sales')
  getMySales(@CurrentUser() user: JwtUser) {
    return this.service.getMySales(user.sub);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.getByIdForUser(id, user.sub);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.updateStatus(id, dto.status, user.sub);
  }

  @Get(':id/invoice')
  async downloadInvoice(
    @Param('id') id: string,
    @CurrentUser() user: JwtUser,
    @Res() res: Response,
  ) {
    const order = await this.service.getByIdForUser(id, user.sub);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=commande-${order.id}.pdf`,
    );

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    });

    doc.pipe(res);

    doc
      .fontSize(22)
      .text('Confirmation de commande', { align: 'center' })
      .moveDown(1.5);

    doc
      .fontSize(12)
      .text(`Commande n° : ${order.id}`)
      .text(`Date : ${order.createdAt.toISOString()}`)
      .moveDown();

    doc.fontSize(14).text('Adresse de livraison', { underline: true });
    doc
      .fontSize(12)
      .moveDown(0.5)
      .text(order.shippingFullName)
      .text(order.shippingLine1);
    if (order.shippingLine2) {
      doc.text(order.shippingLine2);
    }
    doc
      .text(`${order.shippingPostalCode} ${order.shippingCity}`)
      .text(order.shippingCountry);
    if (order.shippingPhone) {
      doc.text(`Tél : ${order.shippingPhone}`);
    }

    doc.moveDown();

    doc.fontSize(14).text('Articles commandés', { underline: true });
    doc.moveDown(0.5);

    order.items.forEach((item) => {
      const lineTotal = item.unitPrice * item.quantity;

      doc
        .fontSize(12)
        .text(`- ${item.articleTitle}`, { continued: true })
        .text(
          `  x${item.quantity}  —  ${item.unitPrice.toFixed(
            2,
          )} € / unité  =>  ${lineTotal.toFixed(2)} €`,
        );
      doc
        .fontSize(10)
        .fillColor('gray')
        .text(
          `  Boutique : ${item.shopName} | Livraison : ${item.shippingCost.toFixed(
            2,
          )} €`,
        )
        .fillColor('black');
      doc.moveDown(0.5);
    });

    doc.moveDown();

    doc
      .fontSize(14)
      .text(`Total payé : ${order.totalAmount.toFixed(2)} ${order.currency}`, {
        align: 'right',
      })
      .moveDown(2);

    doc
      .fontSize(10)
      .fillColor('gray')
      .text(
        'Merci pour votre commande. Conservez ce document comme justificatif.',
        { align: 'center' },
      );

    doc.end();
  }
}
