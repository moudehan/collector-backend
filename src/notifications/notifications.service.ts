import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly gateway: NotificationsGateway,
  ) {}

  getForUser(userId: string) {
    return this.repo.find({
      where: { user: { id: userId } },
      order: { created_at: 'DESC' },
    });
  }

  async send(
    userId: string,
    type: NotificationType,
    payload: Record<string, unknown> = {},
  ) {
    const notif = this.repo.create({
      user: { id: userId },
      type,
      payload,
    });

    await this.repo.save(notif);

    this.gateway.sendToUser(userId, notif);

    return notif;
  }
}
