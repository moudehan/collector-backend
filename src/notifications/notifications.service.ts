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
      where: {
        user: { id: userId },
      },
      order: { created_at: 'DESC' },
    });
  }

  async send(
    userId: string,
    type: NotificationType,
    payload: Record<string, unknown> = {},
    createdBy?: string,
  ) {
    const notif = this.repo.create({
      user: { id: userId },
      type,
      payload,
      created_by: createdBy ? { id: createdBy } : undefined,
    });

    await this.repo.save(notif);

    this.gateway.sendToUser(userId, notif);

    return notif;
  }

  async markAsRead(id: string) {
    await this.repo.update(id, { is_read: true });
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    const result = await this.repo.update(
      { user: { id: userId } },
      { is_read: true },
    );

    return {
      success: true,
      affected: result.affected ?? 0,
    };
  }

  async markAllAsUnread(userId: string) {
    const result = await this.repo.update(
      { user: { id: userId } },
      { is_read: false },
    );

    return {
      success: true,
      affected: result.affected ?? 0,
    };
  }
}
