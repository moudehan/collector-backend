import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MailService } from 'src/mail/mail.service';
import { User } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { NotificationType } from './notification.entity';

@Injectable()
export class NotificationMailService {
  private readonly frontUrl: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly mailService: MailService,
  ) {
    this.frontUrl = process.env.FRONT_URL ?? 'http://localhost:5173';
  }

  async sendNotificationMail(
    userId: string,
    type: NotificationType,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['email'],
    });

    if (!user || !user.email) return;

    const subject =
      type === NotificationType.NEW_ARTICLE
        ? 'Nouvel article disponible'
        : 'Article mis à jour';

    const articleLink =
      typeof payload['article_id'] === 'string'
        ? `${this.frontUrl}/article/detail/${payload['article_id']}`
        : null;

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px">
        <h2 style="color:#1e4fff">${subject}</h2>

        ${
          typeof payload['message'] === 'string'
            ? `<p>${payload['message']}</p>`
            : ''
        }

        ${
          typeof payload['title'] === 'string'
            ? `<p><strong>${payload['title']}</strong></p>`
            : ''
        }

        ${
          articleLink
            ? `<a href="${articleLink}" target="_blank">
                Voir l’article
              </a>`
            : ''
        }

        <br/><br/>
        <small>Collector.shop</small>
      </div>
    `;

    await this.mailService.sendTestMail(user.email, subject, html);
  }
}
