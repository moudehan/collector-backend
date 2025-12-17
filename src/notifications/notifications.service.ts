import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationMailService } from 'src/notifications/notification-mail.service';
import { NotificationSettingsService } from 'src/notifications/notification-settings.service';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './notification.entity';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly gateway: NotificationsGateway,
    private readonly notificationSettingsService: NotificationSettingsService,
    private readonly notificationMailService: NotificationMailService,
  ) {}

  getForUser(userId: string) {
    if (!userId) {
      throw new BadRequestException('userId manquant pour getForUser');
    }
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
  ): Promise<Notification | null> {
    if (!userId) {
      throw new BadRequestException('userId manquant pour send()');
    }
    const settings = await this.notificationSettingsService.getOrCreate(userId);

    if (type === NotificationType.NEW_ARTICLE && !settings.NEW_ARTICLE) {
      return null;
    }

    if (
      type === NotificationType.ARTICLE_UPDATED &&
      !settings.ARTICLE_UPDATED
    ) {
      return null;
    }

    const notif = this.repo.create({
      user: { id: userId },
      type,
      payload,
      created_by: createdBy ? { id: createdBy } : undefined,
      is_read: false,
    });

    const saved = await this.repo.save(notif);
    this.gateway.sendToUser(userId, saved);

    if (settings.MAIL_ENABLED === true) {
      this.notificationMailService
        .sendNotificationMail(userId, type, payload)
        .catch(() => {});
    }
    return saved;
  }

  async markAsRead(id: string) {
    await this.repo.update(id, { is_read: true });
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    if (!userId) {
      throw new BadRequestException('userId manquant pour markAllAsRead');
    }
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
    if (!userId) {
      throw new BadRequestException('userId manquant pour markAllAsUnread');
    }
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
