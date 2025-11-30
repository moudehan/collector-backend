import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/user.decorator';
import type { JwtUser } from 'src/auth/user.type';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chat: ChatService) {}

  @Get(':userId/:articleId')
  getConv(
    @CurrentUser() me: JwtUser,
    @Param('userId') other: string,
    @Param('articleId') articleId: string,
  ) {
    return this.chat.getConversation(me.userId, other, articleId);
  }
}
