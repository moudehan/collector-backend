import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { NotificationSettings } from './notification-settings.entity';

@Injectable()
export class NotificationSettingsService {
  constructor(
    @InjectRepository(NotificationSettings)
    private readonly settingsRepo: Repository<NotificationSettings>,
  ) {}

  private mapToResponse(settings: NotificationSettings) {
    return {
      NEW_ARTICLE: settings.NEW_ARTICLE,
      ARTICLE_UPDATED: settings.ARTICLE_UPDATED,
      ARTICLE_REJECTED: settings.ARTICLE_REJECTED,
      ARTICLE_APPROUVED: settings.ARTICLE_APPROUVED,
      MAIL_ENABLED: settings.MAIL_ENABLED,
    };
  }

  async getOrCreate(userId: string) {
    const existing = await this.settingsRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (existing) {
      return this.mapToResponse(existing);
    }

    const created = this.settingsRepo.create({
      user: { id: userId } as User,
      NEW_ARTICLE: true,
      ARTICLE_UPDATED: true,
      ARTICLE_REJECTED: true,
      ARTICLE_APPROUVED: true,
      MAIL_ENABLED: true,
    });
    const saved = await this.settingsRepo.save(created);
    return this.mapToResponse(saved);
  }

  async update(userId: string, payload: UpdateNotificationSettingsDto) {
    let settings = await this.settingsRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!settings) {
      settings = this.settingsRepo.create({
        user: { id: userId } as User,
        NEW_ARTICLE: true,
        ARTICLE_UPDATED: true,
        ARTICLE_REJECTED: true,
        ARTICLE_APPROUVED: true,
        MAIL_ENABLED: true,
      });
    }

    if (payload.NEW_ARTICLE !== undefined) {
      settings.NEW_ARTICLE = payload.NEW_ARTICLE;
    }

    if (payload.ARTICLE_UPDATED !== undefined) {
      settings.ARTICLE_UPDATED = payload.ARTICLE_UPDATED;
    }

    if (payload.ARTICLE_REJECTED !== undefined) {
      settings.ARTICLE_REJECTED = payload.ARTICLE_REJECTED;
    }

    if (payload.ARTICLE_APPROUVED !== undefined) {
      settings.ARTICLE_APPROUVED = payload.ARTICLE_APPROUVED;
    }

    if (payload.MAIL_ENABLED !== undefined) {
      settings.MAIL_ENABLED = payload.MAIL_ENABLED;
    }

    const saved = await this.settingsRepo.save(settings);
    return this.mapToResponse(saved);
  }
}
